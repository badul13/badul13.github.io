---
title: "Grafana, Prometheus 개념 잡기"
date: 2026-09-23
---

## 개요

ON의 하드웨어 모니터링 기능 제공을 위해 방법을 찾다,  
Grafana-Prometheus를 통해 시각화 대시보드를 구현하는 방법이 일반적이라고 하여 공부 진행

간단하게 개략적인 개념만 잡고, 실제로 진행하면서 심화 내용 공부하기

&nbsp;

## 💥Grafana

> Query, visualize, alert on, and understand your data no matter where it’s stored

말 그대로 위치에 상관없이 데이터를 쿼리하고, 시각화하고, 경고하고, 이해할 수 있게 해 주는 **시각화 대시보드 제공 툴**

오픈소스 툴이지만 제품에 들어갈 기능이니 공부만 하고, 구현은 제품 딴에서 하기로 기획(프론트분이 진행 예정)

&nbsp;

**why Grafana?**

> 데이터 시각화 및 실시간 모니터링

> 중앙 집중된 데이터 관리

> 성능 분석 및 기록

> 다양한 패널 커스터마이징, 다양한 플러그인 지원, 알림 등

&nbsp;

## 🔥Prometheus

> Monitor your applications, systems, and services with \~

인프라 등의 상태를 모니터링하고 경고를 보낼 수 있는 **시계열 데이터베이스**.

&nbsp;

**시계열 데이터**  
시간에 따라 저장된 데이터를, 측정 항목의 이름과 key-value로 정의

**PromQL**  
Prometheus에서 활용하는 쿼리 언어

**Pull Model**  
Http를 통해 Prometheus 서버가 데이터를 직접 가져옴

**Metric**  
현재 시스템의 상태를 표현하는 측정값. 이를 저장하기 위해 쓰는 게 Prometheus인 듯  
*cpu, 메모리, 트래픽, ...*

&nbsp;

> 메트릭을 수집하고, Prometheus 메모리에 저장하고, Http API로 제공하고, 알림을 보내고.
