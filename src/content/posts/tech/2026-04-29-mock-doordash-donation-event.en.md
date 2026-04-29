---
title: "System Design Mock: Review of DoorDash Donation Event"
date: 2026-04-29T19:42:36.342Z
category: tech
tags: ["system-design", "mock", "engineering", "tech"]
lang: en
tldr: "System design for DoorDash's donation event"
description: "A review of the system design for DoorDash's donation event"

type: deep-dive
original_url: "https://www.youtube.com/watch?v=xbnrvkVf0s8"
draft: false
---

Here is the translation of the article:

# System Design Mock: Review of DoorDash's Donation Activity

DoorDash's donation activity is a complex system involving multiple services, databases, and third-party APIs. This article delves into the system design of DoorDash's donation activity, including its design philosophy, core concepts, architecture diagram, and comparison with common alternative solutions. Readers will gain an understanding of how DoorDash designed this system and the considerations and trade-offs behind it.

## TL;DR
The system design of DoorDash's donation activity is a microservices architecture that uses event-driven design to achieve high availability and scalability.

## Design Philosophy
The design philosophy of DoorDash's system is based on event-driven design (EDD), aiming to achieve high availability and scalability. The core idea of this philosophy is to decompose the system into multiple microservices, each responsible for specific business logic, and communicate through event messages. This design enables the system to achieve high availability and scalability and better adapt to changing business needs.

## Core Concepts
The system architecture of DoorDash's donation activity is as follows:
```mermaid
graph LR
  A[Client] -->|Order|> B[Order Service]
  B -->|Create Order|> C[Order Database]
  C -->|Order Event|> D[Event Bus]
  D -->|Order Event|> E[Donation Service]
  E -->|Create Donation|> F[Donation Database]
  F -->|Donation Event|> D
  D -->|Donation Event|> G[Notification Service]
  G -->|Send Notification|> H[Client]
```
The core concepts of the system include:

* Order Service: responsible for processing user orders, creating orders, and saving them to the order database.
* Order Database: stores user order information.
* Event Bus: responsible for transmitting order events and donation events.
* Donation Service: responsible for processing donation requests, creating donations, and saving them to the donation database.
* Donation Database: stores donation information.
* Notification Service: responsible for sending notifications to users.

## Comparison with Common Alternative Solutions
| Scheme | DoorDash | Common Alternative Solutions |
| --- | --- | --- |
| Architecture | Microservices Architecture | Monolithic Architecture |
| Communication Method | Event-Driven Design | API Requests |
| Availability | High Availability | Low Availability |
| Scalability | High Scalability | Low Scalability |

Common alternative solutions include monolithic architecture and API request methods. The disadvantage of monolithic architecture is low availability and scalability, while the disadvantage of API request methods is low communication efficiency.

## Suitable/Unsuitable Scenarios
DoorDash's system design is suitable for business scenarios that require high availability and scalability, but not suitable for small businesses or experimental projects.

## Overall
DoorDash's system design is a typical microservices architecture that uses event-driven design to achieve high availability and scalability. This design is suitable for business scenarios that require high availability and scalability, but requires consideration of system complexity and maintenance costs.

## References
* [DoorDash's Engineering Blog](https://doordash.engineering/)
* [Event-Driven Architecture](https://en.wikipedia.org/wiki/Event-driven_architecture)