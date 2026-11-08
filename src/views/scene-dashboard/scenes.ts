import { getPublicImageUrl } from "@/utils/common";
const image = (name: string) => getPublicImageUrl(`dashboards/${name}`);
const autonomousDrivingImage = image("autonomous-driving.jpg");
const embodiedAiImage = image("embodied-ai.jpg");
const integratedCircuitImage = image("integrated-circuit.jpg");
const lifeScienceImage = image("life-science.jpg");
const lowAltitudeEconomyImage = image("low-altitude-economy.jpg");
const medicalImagingImage = image("medical-imaging.jpg");
const railTransitImage = image("rail-transit.jpg");
const remoteSensingImage = image("remote-sensing.jpg");
const smartManufacturingImage = image("smart-manufacturing.jpg");
import type { IndustryScene, ProfessionalCapability } from "./scene";

export const industryScenes: IndustryScene[] = [
  {
    key: "autonomous-driving",
    title: "自动驾驶",
    kicker: "行业场景",
    description:
      "面向智能驾驶感知与决策模型，提供多传感器融合、3D/4D 时空标注、轨迹跟踪及复杂场景数据生产能力。",
    image: autonomousDrivingImage,
    status: "available",
  },
  {
    key: "embodied-ai",
    title: "具身智能",
    kicker: "行业场景",
    description:
      "面向机器人与 VLA 模型训练，提供视觉、点云、状态、动作及操作轨迹等多模态具身数据生产能力。",
    image: embodiedAiImage,
    status: "coming-soon",
  },
  {
    key: "smart-manufacturing",
    title: "智能制造",
    kicker: "行业场景",
    description:
      "面向工业质检、智能产线与设备运维，提供图像、视频、3D、X-Ray、热成像等多模态数据标注与缺陷数据生产能力。",
    image: smartManufacturingImage,
    status: "coming-soon",
  },
  {
    key: "integrated-circuit",
    title: "集成电路",
    kicker: "行业场景",
    description:
      "面向晶圆制造、封装测试与质量检测，提供晶圆图、AOI、SEM、X-Ray 等专业数据标注、缺陷识别与分类数据生产能力。",
    image: integratedCircuitImage,
    status: "coming-soon",
  },
  {
    key: "life-science",
    title: "生命科学",
    kicker: "行业场景",
    description:
      "面向生物医学研究与生命科学 AI，提供细胞、组织、显微影像及实验数据的专业标注、结构化处理与专家质控能力。",
    image: lifeScienceImage,
    status: "coming-soon",
  },
  {
    key: "medical-imaging",
    title: "医学影像",
    kicker: "行业场景",
    description:
      "面向 CT、MRI、X-Ray 与 DICOM 影像，提供病灶检测、器官分割、结构化诊断及多级专家审核能力。",
    image: medicalImagingImage,
    status: "available",
  },
  {
    key: "remote-sensing",
    title: "遥感测绘",
    kicker: "行业场景",
    description:
      "面向遥感影像、测绘与地理空间工程数据，提供 SAR、LiDAR、目标检测、变化识别及地物分类数据生产能力。",
    image: remoteSensingImage,
    status: "coming-soon",
  },
  {
    key: "rail-transit",
    title: "轨道交通",
    kicker: "行业场景",
    description:
      "面向铁路、地铁及轨道交通智能运维，提供图像、视频、LiDAR、红外及传感器数据的设施识别、缺陷检测、异物侵限与运行状态数据生产能力。",
    image: railTransitImage,
    status: "coming-soon",
  },
  {
    key: "low-altitude-economy",
    title: "低空经济",
    kicker: "行业场景",
    description:
      "面向无人机、低空飞行器与低空智能感知，提供航拍影像、视频、点云及多传感器数据的目标识别、环境感知、航迹分析与复杂场景数据生产能力。",
    image: lowAltitudeEconomyImage,
    status: "coming-soon",
  },
];
export const professionalCapabilities: ProfessionalCapability[] = [
  {
    key: "sensor-fusion",
    title: "多传感器融合",
    icon: "fusion",
    description:
      "面向 Camera、LiDAR、Radar、RGB-D、IMU 等多源异构数据，提供时空同步、跨模态关联、联动标注与一致性校验。",
  },
  {
    key: "spatiotemporal",
    title: "3D/4D 时空数据",
    icon: "cube",
    description:
      "面向点云和连续时序场景，提供 3D 检测、分割、Tracking、Trajectory、BEV、Occupancy 等高阶数据生产能力。",
  },
  {
    key: "temporal-understanding",
    title: "时序数据理解",
    icon: "timeline",
    description:
      "面向长视频及多镜头视频，提供事件切分、动作识别、Temporal Grounding、行为关系及复杂过程理解数据。",
  },
  {
    key: "fine-vision",
    title: "精细视觉识别",
    icon: "vision",
    description:
      "面向复杂视觉任务，提供目标检测、实例分割、关键点、细粒度属性、关系标注及复杂场景解析数据。",
  },
  {
    key: "multimodal-model",
    title: "多模态大模型",
    icon: "multimodal",
    description:
      "面向 VLM、MLLM 等多模态模型，提供图文、视频、音频、点云与文本之间的指令、问答、Grounding 和推理数据。",
  },
  {
    key: "instruction-tuning",
    title: "大模型指令微调",
    icon: "instruction",
    description:
      "面向模型 SFT/Post-training，提供高质量 Instruction-Response、多轮对话、领域知识及复杂任务指令数据构建。",
  },
  {
    key: "preference-alignment",
    title: "偏好对齐与强化学习",
    icon: "alignment",
    description:
      "面向 RLHF、RLAIF、Reward Model 等模型后训练任务，提供 Response Ranking、Preference、评分与安全对齐数据。",
  },
  {
    key: "agent-trajectory",
    title: "Agent 轨迹与工具调用",
    icon: "agent",
    description:
      "面向 AI Agent 训练与评测，提供 Observation、Reasoning、Tool Calling、Action 等任务执行及工具调用数据。",
  },
  {
    key: "expert-quality",
    title: "专家标注与共识质控",
    icon: "expert",
    description:
      "面向高专业门槛数据，提供专家初标、多级复核、多人共识、质量评分及专家仲裁等高质量数据生产机制。",
  },
  {
    key: "human-in-loop",
    title: "AI 预标注与人机协同",
    icon: "collaboration",
    description:
      "利用视觉模型、大模型及行业模型进行自动预标注，通过 Human-in-the-loop 完成人工修订、复核与持续优化。",
  },
  {
    key: "hard-case-mining",
    title: "困难样本挖掘与主动学习",
    icon: "mining",
    description:
      "面向模型薄弱环节自动发现 Hard Case、长尾样本、错例和低置信样本，并驱动针对性数据回流与增量标注。",
  },
  {
    key: "benchmark",
    title: "评测集与 Benchmark 构建",
    icon: "benchmark",
    description:
      "面向模型能力验证，提供测试集、Golden Dataset、挑战集、对抗样本及 Benchmark 设计和版本管理能力。",
  },
];
