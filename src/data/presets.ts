import type { ImageRatio, CustomPresetMeta } from "../types";

import threeDImg from "../images/3d.png";
import animeImg from "../images/anime.png";
import cyberpunkImg from "../images/cyberpunk.png";
import robotImg from "../images/robot.png";

export interface Preset {
  id: string;
  title: string;
  image: string;
  prompt: string;
  ratio?: ImageRatio;
}

export const DEFAULT_IDS = new Set(["3d", "anime", "cyberpunk", "robot"]);

const DEFAULTS: Preset[] = [
  {
    id: "3d",
    title: "3D 手办",
    image: threeDImg,
    prompt:
      "参考我给的图片、盲盒手办、3D 渲染、纯白干净背景、圆形底座、高级哑光 PVC 材质、Q 版站姿、全身",
    ratio: "1:1",
  },
  {
    id: "anime",
    title: "日漫风格",
    image: animeImg,
    prompt:
      "日系动漫插画、赛璐璐风格、 vibrant 色彩、精细线稿、樱花花瓣飘落、柔和自然光、吉卜力画风、高品质壁纸",
    ratio: "1:1",
  },
  {
    id: "cyberpunk",
    title: "赛博朋克",
    image: cyberpunkImg,
    prompt:
      "赛博朋克城市夜景、霓虹灯在湿润街道上的反射、全息广告牌、雨天、电影级光影、银翼杀手美学、高细节、未来科技感",
    ratio: "16:9",
  },
  {
    id: "robot",
    title: "科技机甲",
    image: robotImg,
    prompt:
      "高细节机械机器人、复杂金属装甲面板、发光核心、科幻机甲设计、戏剧性边缘光、暗色背景、写实风格、工业设计美学",
    ratio: "1:1",
  },
];

export function getDefaultPresets(): Preset[] {
  return DEFAULTS;
}

export function resolvePresets(
  overrides: Record<string, { id: string; title?: string; prompt?: string }>,
  customImageUrls: Record<string, string>,
  customPresets: CustomPresetMeta[] = [],
  customPresetBlobUrls: Record<string, string> = {},
): Preset[] {
  const resolvedDefaults = DEFAULTS.map((p) => {
    const ov = overrides[p.id];
    const customImage = customImageUrls[p.id];
    return {
      ...p,
      title: ov?.title || p.title,
      prompt: ov?.prompt || p.prompt,
      image: customImage || p.image,
    };
  });

  const resolvedCustoms: Preset[] = customPresets.map((cp) => ({
    id: cp.id,
    title: cp.title,
    prompt: cp.prompt,
    image: customPresetBlobUrls[cp.id] || "",
    ratio: cp.ratio as ImageRatio | undefined,
  }));

  return [...resolvedDefaults, ...resolvedCustoms];
}

// Backward-compatible default export
export const presets: Preset[] = DEFAULTS;
