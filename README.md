# 动感教练 — 基于多传感器融合的可穿戴 AI 运动教练

## 一、作品简介

「动感教练」是一款面向健身爱好者和运动初学者的智能手表应用，解决"独自锻炼时缺乏动作指导、容易姿势错误"的问题。通过手表端多传感器实时采集运动姿态，结合 AI 大模型进行动作质量评估与个性化训练指导。

**核心亮点：**
- 多运动类型支持（深蹲、俯卧撑、开合跳、高抬腿、跑步）
- 实时运动数据可视化（环形进度、波形图、评分）
- 组间休息自动倒计时
- AI 健康评估与建议
- 蓝牙小智AI语音助手集成
- 完整的运动历史记录

## 二、选题方向

**快应用 / 手表应用创新**

基于 openvela 快应用框架开发，充分利用黄山派 SF32LB52 开发板的硬件资源（六轴IMU、心率传感器、AMOLED屏幕、振动马达、BLE 5.3），打造沉浸式运动指导体验。

## 三、目录结构

```
contest2026_044_EsperantoR/
├── quickapp/
│   └── hello_quickapp/          # 快应用主目录
│       ├── src/
│       │   ├── app.ux           # 应用入口
│       │   ├── manifest.json    # 应用配置
│       │   ├── common/          # 公共模块
│       │   │   ├── bleService.js      # 蓝牙通信
│       │   │   ├── constants.js       # 全局常量
│       │   │   ├── dataStore.js       # 数据存储
│       │   │   ├── eventBus.js        # 事件总线
│       │   │   ├── exerciseStateMachine.js  # 运动状态机
│       │   │   ├── gestureRouter.js   # 手势路由
│       │   │   ├── logger.js          # 日志
│       │   │   ├── motion.js          # 运动检测算法
│       │   │   ├── pageManager.js     # 页面管理
│       │   │   ├── powerManager.js    # 电源管理
│       │   │   ├── sensorManager.js   # 传感器管理
│       │   │   ├── storage.js         # 本地存储
│       │   │   └── utils.js           # 工具函数
│       │   ├── components/      # 公共组件
│       │   │   └── nav-bar.ux         # 导航栏组件
│       │   └── pages/           # 页面
│       │       ├── clock/             # 表盘（入口）
│       │       ├── exercise_select/   # 功能层（10项功能）
│       │       ├── exercise_list/     # 运动选择列表
│       │       ├── exercise_active/   # 运动中（核心页面）
│       │       ├── ai_result/         # AI训练结果
│       │       ├── history/           # 历史记录
│       │       ├── compass/           # 罗盘
│       │       ├── altitude/          # 海拔
│       │       ├── timer/             # 计时器
│       │       ├── music/             # 音乐控制
│       │       ├── health/            # AI健康评估
│       │       ├── weather/           # 天气
│       │       ├── settings/          # 系统设置
│       │       ├── xiaozhi/           # 小智AI
│       │       └── control_center/    # 控制中心
│       ├── package.json
│       └── manifest.json
├── app/                         # 原生应用（备用）
├── board/                       # 板级适配（备用）
├── logs/                        # AI Coding 日志
└── README.md                    # 本文件
```

## 四、功能架构

### Layer 0: 表盘层
- 时间、日期、步数、心率显示
- "进入功能"按钮进入功能层

### Layer 1: 功能层（上下滚动选择）
| 功能 | 说明 |
|------|------|
| 🏋️ 运动选择 | 深蹲/俯卧撑/开合跳/高抬腿/跑步 |
| 📊 历史记录 | 最近10次运动记录 |
| 🧭 罗盘 | 户外方位指示 |
| 🌤️ 天气 | 天气信息与运动建议 |
| ⛰️ 海拔 | 海拔高度显示 |
| ⏱️ 计时器 | 秒表/倒计时 |
| 🎵 音乐 | 音乐播放控制 |
| ❤️ AI健康评估 | 健康指数与AI建议 |
| 🤖 小智AI | BLE语音助手 |
| ⚙️ 系统设置 | 亮度/振动/连接配置 |

### Layer 2: 运动中交互
- **开始按钮** → 进入运动模式
- **暂停/继续按钮** → 控制运动状态
- **结束按钮** → 保存数据并显示结果
- **退出按钮** → 退出当前运动
- **下滑** → 查看该运动类型历史记录
- **2分钟无操作** → 自动暂停进入待机

## 五、运行方式

### 1. 拉取工程
```bash
repo init -u https://github.com/open-vela/contest2026_044_EsperantoR \
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
- 蓝牙小智AI通信模块
- 公共组件和样式提取
- 模拟器配置与调试

完整对话日志见 `logs/` 目录。

## 七、技术栈

- **框架**：openvela 快应用（类 Vue 语法）
- **目标设备**：黄山派 SF32LB52（Cortex-M33）
- **传感器**：六轴IMU、心率、环境光、地磁
- **通信**：BLE 5.3
- **显示**：AMOLED 390×450
- **开发工具**：AIoT-IDE + 模拟器
