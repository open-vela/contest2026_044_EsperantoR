# 动感教练 — 基于多传感器融合的可穿戴 AI 运动教练

> **参赛队伍**: EsperantoR | **作品编号**: contest2026_044 | **选题方向**: 快应用 / 手表应用创新

## 一、作品简介

「动感教练」是一款面向健身爱好者和运动初学者的智能手表应用，解决"独自锻炼时缺乏动作指导、容易姿势错误"的问题。通过手表端多传感器实时采集运动姿态，结合 AI 大模型进行动作质量评估与个性化训练指导。

**核心亮点：**
- 多运动类型支持（深蹲、俯卧撑、开合跳、高抬腿）
- 实时运动数据可视化（环形进度、波形图、评分）
- 组间休息自动倒计时
- AI 健康评估与建议
- 蓝牙小智 AI 语音助手集成
- 完整的运动历史记录
- 基于加速度计的滑动窗口+峰值检测算法

## 二、目录结构

```
contest2026_044_EsperantoR/
├── quickapp/
│   └── hello_quickapp/              # 快应用主目录
│       ├── src/
│       │   ├── app.ux               # 应用入口
│       │   ├── manifest.json        # 应用配置（路由注册）
│       │   ├── common/              # 公共模块（13个）
│       │   │   ├── bleService.js        # 蓝牙小智AI通信
│       │   │   ├── constants.js         # 全局常量
│       │   │   ├── dataStore.js         # 数据存储
│       │   │   ├── eventBus.js          # 事件总线
│       │   │   ├── exerciseStateMachine.js  # 运动状态机
│       │   │   ├── gestureRouter.js     # 手势路由
│       │   │   ├── logger.js            # 日志
│       │   │   ├── motion.js            # 运动检测算法
│       │   │   ├── pageManager.js       # 页面管理
│       │   │   ├── powerManager.js      # 电源管理
│       │   │   ├── sensorManager.js     # 传感器管理
│       │   │   ├── storage.js           # 本地存储
│       │   │   ├── styles.css           # 公共样式
│       │   │   └── utils.js             # 工具函数
│       │   ├── components/          # 公共组件
│       │   │   └── nav-bar.ux           # 导航栏组件
│       │   └── pages/               # 页面（15个）
│       │       ├── clock/               # 表盘（入口）
│       │       ├── exercise_select/     # 运动选择
│       │       ├── exercise_list/       # 运动列表
│       │       ├── exercise_active/     # 运动中（核心）
│       │       ├── ai_result/           # AI训练结果
│       │       ├── history/             # 历史记录
│       │       ├── compass/             # 罗盘
│       │       ├── altitude/            # 海拔
│       │       ├── timer/               # 计时器
│       │       ├── music/               # 音乐控制
│       │       ├── health/              # AI健康评估
│       │       ├── weather/             # 天气
│       │       ├── settings/            # 系统设置
│       │       ├── xiaozhi/             # 小智AI
│       │       └── control_center/      # 控制中心
│       ├── package.json
│       └── manifest.json
├── app/                             # 原生应用（备用）
├── board/                           # 板级适配（备用）
├── logs/                            # AI Coding 日志
│   ├── guling404/                   # 开发者日志
│   └── README.md
├── contest2026_044_EsperantoR.xml   # 工程清单
├── openvela.xml                     # openvela 清单
└── README.md                        # 本文件
```

## 三、功能架构

### Layer 0: 表盘层
- 时间、日期、步数、心率显示
- "进入功能"按钮进入功能层

### Layer 1: 功能层（上下滚动选择）

| 功能 | 页面 | 说明 |
|------|------|------|
| 🏋️ 运动选择 | exercise_select | 深蹲/俯卧撑/开合跳/高抬腿 |
| 📋 运动列表 | exercise_list | 运动类型列表与历史 |
| 📊 历史记录 | history | 最近10次运动记录 |
| 🧭 罗盘 | compass | 户外方位指示 |
| 🌤️ 天气 | weather | 天气信息与运动建议 |
| ⛰️ 海拔 | altitude | 海拔高度显示 |
| ⏱️ 计时器 | timer | 秒表/倒计时 |
| 🎵 音乐 | music | 音乐播放控制 |
| ❤️ AI健康评估 | health | 健康指数与AI建议 |
| 🤖 小智AI | xiaozhi | BLE语音助手 |
| ⚙️ 系统设置 | settings | 亮度/振动/连接配置 |
| 📱 控制中心 | control_center | 快捷设置面板 |

### Layer 2: 运动中交互
- **开始按钮** → 进入运动模式
- **暂停/继续按钮** → 控制运动状态
- **结束按钮** → 保存数据并显示结果
- **退出按钮** → 退出当前运动
- **下滑** → 查看该运动类型历史记录
- **2分钟无操作** → 自动暂停进入待机

## 四、核心模块

### 运动检测算法 (`motion.js`)
基于加速度计的滑动窗口+峰值检测算法，不同运动类型使用不同的阈值和窗口参数：
- **深蹲**: 阈值 12.0，窗口 20，最小间隔 800ms
- **俯卧撑**: 阈值 10.0，窗口 18，最小间隔 700ms
- **开合跳**: 阈值 14.0，窗口 15，最小间隔 400ms
- **高抬腿**: 阈值 11.0，窗口 12，最小间隔 300ms

### 运动状态机 (`exerciseStateMachine.js`)
管理运动生命周期：`READY → RUNNING → PAUSED → FINISHED`
- 精确计时（排除暂停时间）
- 暂停次数统计
- 状态变更事件通知

### 蓝牙通信 (`bleService.js`)
通过 BLE 5.3 与手机端小智 AI 服务通信：
- 发送运动特征数据
- 接收 AI 评分与建议
- 支持模拟模式（无 BLE 环境）

### 传感器管理 (`sensorManager.js`)
封装六轴 IMU、心率、环境光、地磁传感器接口

### 数据存储 (`dataStore.js` + `storage.js`)
运动历史、用户设置的本地持久化

## 五、运行方式

### 1. 拉取工程
```bash
repo init -u https://gitee.com/guling404-spirit/contest2026_044_EsperantoR \
  -b dev-ai-contest-2026 -m contest2026_044_EsperantoR.xml
repo sync -c -j8
```

### 2. 模拟器运行
1. 用 AIoT-IDE 打开 `quickapp/hello_quickapp` 目录
2. 点击"编译预览"按钮
3. 选择模拟器设备（dd 或 Vela_Virtual_Device）
4. 等待编译完成并自动推送

### 3. 真机运行
1. 确保开发板已烧录 openvela 固件（支持快应用运行时）
2. 开发板通过串口连接电脑（COM6）
3. 在 AIoT-IDE 中选择真机设备
4. 点击"编译预览"推送快应用

## 六、AI Coding 使用说明

### 开发协作方式
- **需求拆解**：通过 AI 分析设计文档，拆解为可执行的开发任务
- **方案设计**：AI 参考 openvela 快应用框架文档，设计页面架构和交互方案
- **编码实现**：AI 生成页面模板、样式和脚本代码
- **调试优化**：AI 分析模拟器日志，定位并修复渲染和交互问题

### 主要 AI 辅助成果
- 15个页面的完整实现
- 运动检测算法（滑动窗口+峰值检测）
- 运动状态机（READY→RUNNING→PAUSED→FINISHED）
- 蓝牙小智 AI 通信模块
- 公共组件和样式提取
- 模拟器配置与调试

完整对话日志见 `logs/` 目录。

## 七、技术栈

| 类别 | 技术 |
|------|------|
| **框架** | openvela 快应用（类 Vue 语法） |
| **目标设备** | 黄山派 SF32LB52（Cortex-M33） |
| **传感器** | 六轴 IMU、心率、环境光、地磁 |
| **通信** | BLE 5.3 |
| **显示** | AMOLED 390×450 |
| **开发工具** | AIoT-IDE + 模拟器 |
| **AI 工具** | Claude Code / MiMoCode |

## 八、Git 提交记录

```
a48f8fd update project
f8e7d69 fix: 修复 JS 引号断裂和未闭合字符串
b7e2acc fix: 移除所有 .ux 文件 UTF-8 BOM 标记
eff84bc fix: P0-P2 优化 - 编码修复/BLE声明/AI事件链路/传感器扩展/冷启动回填/config补全
2ee3b62 fix: 13项优化 - 圆形屏适配/BLE真实接口/阈值钳制/AI loading/时间格式/离线提示/跑步估算
dda5cb9 docs: 添加 AI Coding 会话日志
ced9997 feat: 动感教练快应用完整实现
4f29e7b chore: add issue templates
7aa221c manifest: add libs_sifli_sf32lb52 prebuilt libraries
74e8860 Initial commit: scaffold contest repo for team EsperantoR
```

## 九、仓库地址

- **Gitee**: https://gitee.com/guling404-spirit/contest2026_044_EsperantoR

---

**队伍**: EsperantoR | **作者**: guling404
