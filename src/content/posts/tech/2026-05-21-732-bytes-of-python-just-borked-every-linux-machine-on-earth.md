---
title: "732 個位元組的 Python 腳本讓幾乎所有 Linux 機器淪陷——CopyFail 漏洞解析"
date: 2026-05-21T03:35:01.985Z
category: tech
tags: ["linux", "security", "python", "cve", "kernel"]
lang: zh-TW
tldr: "CVE-2026-31431（CopyFail）是一個 Linux 核心頁面快取漏洞，只需 732 bytes 的 Python 腳本就能在幾乎所有 2017 年後的 Linux 發行版上提權到 root。"
description: "CVE-2026-31431 CopyFail 漏洞解析：一個 732 bytes 的 Python 腳本如何利用 Linux 核心頁面快取缺陷，靜默修改記憶體內容並提權到 root。"
type: newsjacking
original_url: "https://www.youtube.com/watch?v=lkifbWtxxlk"
draft: true
audio_url: "/api/tts/r2/tts/tts_20260615_194934_897340.mp3"
---

一個不需要 root、不需要特殊工具、只用 Python 標準函式庫就能寫出的 732 bytes 腳本，可以在你的 Ubuntu、Debian、RHEL、Arch、SUSE 上取得 root 權限。這不是誇大，這是 2026 年 4 月正式披露的 CVE-2026-31431，代號「CopyFail」。

## TL;DR

**CVE-2026-31431（CopyFail）**：Linux 核心 authencesn 加密模板的邏輯缺陷，允許非特權本機使用者對任何可讀檔案的**頁面快取**執行可控的 4-byte 寫入，且核心不會將被汙染的頁面標記為「dirty」（等待回寫），導致磁碟上的檔案完整無缺，但記憶體中的版本已被竄改並全系統可見。影響範圍：2017 年後幾乎所有主流 Linux 發行版。已於 2026 年 4 月 1 日合併修補程式進主線核心。

## 發生了什麼

CopyFail 披露於 2026 年 4 月底，技術細節由資安研究團隊 [Xint](https://xint.io/blog/copy-fail-linux-distributions) 公開。核心問題出在 Linux 核心的 **authencesn** 加密模板——一個處理認證加密的底層元件。

這個缺陷讓攻擊者可以：

1. 以非特權身份對任何**可讀**檔案的頁面快取執行 **4-byte 精確寫入**
2. 核心不會把被汙染的頁面標記為 dirty，因此不會觸發回寫（write-back），磁碟上的檔案保持乾淨
3. 但頁面快取才是系統實際讀取的位置——包括所有 process、所有容器

這代表攻擊者可以在記憶體中靜默竄改一個 setuid binary（例如 `/usr/bin/passwd`），讓下次執行時直接取得 root shell，同時：
- 磁碟上的檔案通過任何 checksum 驗證
- SELinux/AppArmor 等基於檔案屬性的防護形同虛設
- 日誌裡不會留下明顯痕跡

## 為什麼這件事值得關注

### CVSSv3 評分 7.8（High），但現實影響更嚴重

CVSS 評分 7.8 意味著這是**本機提權漏洞**，需要先登入系統才能利用。這限制了遠端大規模攻擊的可能性。但以下幾個原因讓這個漏洞格外棘手：

**容器穿透**：Linux 頁面快取是跨所有 process 和容器共享的核心資源。Kubernetes 叢集中，一旦攻擊者取得單一 pod 的程式碼執行能力（例如透過 RCE 漏洞），就可以用 CopyFail 竄改同一節點上所有工作負載共用的記憶體，進而提權到 K8s node，影響整個節點的工作負載。

**隱蔽性極強**：傳統的完整性驗證工具（AIDE、Tripwire）比對的是磁碟上的雜湊值，完全偵測不到純頁面快取汙染。這讓 CopyFail 成為一個天然的「無痕提權」技術。

**影響範圍廣泛**：Ubuntu、RHEL、Debian、Fedora、Arch、SUSE、Amazon Linux 均受影響。任何 2017 年後出廠並未更新核心的機器都在範圍內。

### 腳本本身令人印象深刻

整個 exploit 只用到 Python 標準函式庫（`os`、`socket`、`zlib`），需要 Python 3.10+ 以使用 `os.splice()`。這代表：
- 不需要安裝任何第三方套件
- 不需要編譯 C 程式
- 幾乎所有現代 Linux 系統預裝的 Python 版本就夠用

## 技術角度怎麼看

### 頁面快取的信任假設被打破了

Linux 核心長期以來有個隱性假設：如果你沒有寫入權限，你就無法修改快取中的內容。CopyFail 在 authencesn 的特定程式碼路徑中打破了這個假設。

問題在於加密操作的**in-place 修改邏輯**——當某個加密操作失敗但已部分修改了 page 的內容時，核心沒有正確地將這個 page 標記為需要丟棄或回寫。這個「4-byte 寫入窗口」就是漏洞的核心。

### 修補方式

修補程式已於 2026 年 4 月 1 日合併進 Linux 主線核心，修正了 authencesn 在操作失敗時的頁面清理邏輯。各發行版正陸續透過標準更新通道推出修補版核心。

## 後續值得觀察的點

1. **你的 K8s 叢集升了嗎？** 雲端環境中的多租戶叢集是最需要立即修補的目標。在共用節點上執行不受信任工作負載的情境（CI/CD、serverless）尤其危險。

2. **頁面快取完整性監控** 這個事件暴露了現有 integrity monitoring 工具的盲點。未來可能出現針對頁面快取的運行期監控方案。

3. **類似漏洞類型還有多少？** authencesn 不是唯一做 in-place 加密操作的核心元件，類似的假設可能存在於其他地方。

## 立即行動

```bash
# 確認目前核心版本
uname -r

# Ubuntu/Debian
sudo apt update && sudo apt upgrade linux-image-generic

# RHEL/Fedora/CentOS
sudo dnf update kernel

# Arch Linux
sudo pacman -Syu linux
```

修補後重開機使新核心生效。

## 參考資料

- [Copy Fail: 732 Bytes to Root on Linux - Xint](https://xint.io/blog/copy-fail-linux-distributions)
- [CVE-2026-31431: 732 bytes to become root on (almost) every Linux server - Loginline](https://www.loginline.com/en/blog/cve-2026-31431)
- [A single 732-byte Python script can be used to obtain root on essentially all Linux distributions shipped since 2017 - PC Gamer](https://www.pcgamer.com/software/linux/a-single-732-byte-python-script-can-be-used-to-obtain-root-on-essentially-all-linux-distributions-shipped-since-2017-time-to-update-your-kernel/)
- [CopyFail (CVE-2026-31431): How a 732-Byte Python Script Gets Root on Almost Every Linux Machine - DEV Community](https://dev.to/itsmegsg/copyfail-cve-2026-31431-how-a-732-byte-python-script-gets-root-on-almost-every-linux-machine-3ddm)
