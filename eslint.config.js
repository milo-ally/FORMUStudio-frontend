const fs = require('fs');
const potrace = require('potrace');

const inputPath = './formu_logo.png'; // 你的图片路径
const outputPath = './formu_logo.svg';

// 配置转换参数，确保转换效果符合 Logo 的简洁需求
const params = {
  threshold: 150,     // 阈值，数值越大越敏感
  turdSize: 10,       // 忽略小于此像素的杂点
  turnPolicy: potrace.Potrace.TURN_BLACK
};

potrace.trace(inputPath, params, (err, svgData) => {
  if (err) {
    console.error('转换失败:', err);
    return;
  }
  
  fs.writeFile(outputPath, svgData, (writeErr) => {
    if (writeErr) {
      console.error('保存 SVG 失败:', writeErr);
    } else {
      console.log(`成功！SVG 文件已保存至: ${outputPath}`);
    }
  });
});