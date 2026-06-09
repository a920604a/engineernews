---
title: "CopyFail (CVE-2026-31431): How 732 Bytes of Python Gets Root on Nearly Every Linux Machine"
date: 2026-05-21T03:35:01.985Z
category: tech
tags: ["linux", "security", "python", "cve", "kernel"]
lang: en
tldr: "CVE-2026-31431 (CopyFail) is a Linux kernel page cache vulnerability allowing a 732-byte Python script using only standard library modules to achieve root privilege escalation on virtually all Linux distributions released since 2017."
description: "Deep dive into CVE-2026-31431 (CopyFail): how a logic bug in the Linux kernel's authencesn cryptographic template enables silent page cache corruption and privilege escalation without leaving traces on disk."
type: newsjacking
original_url: "https://www.youtube.com/watch?v=lkifbWtxxlk"
draft: false
---

A 732-byte Python script using only the standard library — no root access required, no special tools, no third-party packages — can obtain root on your Ubuntu, Debian, RHEL, Arch, or SUSE system. This isn't theoretical. This is CVE-2026-31431, codenamed "CopyFail," publicly disclosed in April 2026.

## TL;DR

**CVE-2026-31431 (CopyFail)**: A logic bug in the Linux kernel's authencesn cryptographic template allows an unprivileged local user to perform a controlled 4-byte write into the **page cache** of any readable file. The kernel never marks the corrupted page as dirty, so the on-disk file passes all checksum verification — but the in-memory version is immediately visible system-wide. Affected: virtually all major Linux distributions released since 2017. Fixed: merged into mainline Linux kernel on April 1, 2026.

## What Happened

CopyFail was disclosed publicly in late April 2026, with technical details published by security research team [Xint](https://xint.io/blog/copy-fail-linux-distributions). The root cause is in the Linux kernel's **authencesn** template — a component handling authenticated encryption.

The flaw allows an attacker to:

1. As an unprivileged user, trigger a **precise 4-byte write** into the page cache of any **readable** file
2. The kernel never marks the corrupted page as dirty, so no writeback is triggered — the on-disk file remains intact
3. But the page cache is what the system actually reads — across all processes, all containers

This means an attacker can silently corrupt a setuid binary in memory (e.g., `/usr/bin/passwd`), making the next execution spawn a root shell, while:
- The on-disk file passes any checksum verification
- SELinux/AppArmor file-attribute-based protections are bypassed
- Nothing suspicious appears in logs

## Why It Matters

### CVSSv3 Score 7.8 (High) — But Real-World Impact Is Worse

The CVSS rating of 7.8 reflects that this is a **local privilege escalation** vulnerability requiring prior system access. This limits remote mass exploitation. But several factors make it especially dangerous:

**Container escape**: Linux page cache is a kernel resource shared across all processes and containers on the same host. In a Kubernetes cluster, an attacker with code execution in a single pod (e.g., via an RCE vulnerability) can use CopyFail to corrupt memory shared across all workloads on the same node, escalating to the K8s node and affecting all co-hosted workloads.

**Undetectable by standard tools**: Traditional integrity monitoring tools (AIDE, Tripwire) compare on-disk hashes — completely blind to pure page cache corruption. CopyFail is a natural "traceless escalation" technique.

**Broad scope**: Ubuntu, RHEL, Debian, Fedora, Arch, SUSE, Amazon Linux all affected. Any machine running a kernel from 2017 onward without the patch is vulnerable.

### The Script Itself Is Impressive

The entire exploit uses only Python standard library modules (`os`, `socket`, `zlib`) and requires Python 3.10+ for `os.splice()`. This means:
- No third-party package installation
- No C compilation
- Python versions preinstalled on virtually all modern Linux systems suffice

## Technical Breakdown

### The Page Cache Trust Assumption Is Broken

The Linux kernel has long had an implicit assumption: if you don't have write permissions, you can't modify cached content. CopyFail breaks this assumption in a specific code path within authencesn.

The issue lies in the **in-place modification logic** of certain cryptographic operations. When an operation fails after partially modifying a page, the kernel doesn't properly mark that page for invalidation or writeback. This "4-byte write window" is the vulnerability.

### The Fix

The patch was merged into the mainline Linux kernel on April 1, 2026, correcting authencesn's page cleanup logic when operations fail. Distributions are rolling out patched kernels through standard update channels.

## What to Watch

1. **Is your Kubernetes cluster patched?** Multi-tenant clusters where untrusted workloads run on shared nodes (CI/CD, serverless) are the highest-priority targets.

2. **Page cache integrity monitoring**: This vulnerability exposes a blind spot in existing integrity tools. Expect runtime monitoring solutions targeting page cache to emerge.

3. **Similar vulnerability classes**: authencesn isn't the only kernel component doing in-place crypto operations. Similar assumptions may exist elsewhere.

## Immediate Action

```bash
# Check current kernel version
uname -r

# Ubuntu/Debian
sudo apt update && sudo apt upgrade linux-image-generic

# RHEL/Fedora/CentOS
sudo dnf update kernel

# Arch Linux
sudo pacman -Syu linux
```

Reboot after patching to load the new kernel.

## References

- [Copy Fail: 732 Bytes to Root on Linux - Xint](https://xint.io/blog/copy-fail-linux-distributions)
- [CVE-2026-31431: 732 bytes to become root on (almost) every Linux server - Loginline](https://www.loginline.com/en/blog/cve-2026-31431)
- [A single 732-byte Python script can be used to obtain root on essentially all Linux distributions shipped since 2017 - PC Gamer](https://www.pcgamer.com/software/linux/a-single-732-byte-python-script-can-be-used-to-obtain-root-on-essentially-all-linux-distributions-shipped-since-2017-time-to-update-your-kernel/)
- [CopyFail (CVE-2026-31431): How a 732-Byte Python Script Gets Root - DEV Community](https://dev.to/itsmegsg/copyfail-cve-2026-31431-how-a-732-byte-python-script-gets-root-on-almost-every-linux-machine-3ddm)
