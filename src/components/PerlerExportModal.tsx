import { useState } from "react";
import type { PerlerExportOptions } from "../types";

interface PerlerExportModalProps {
  open: boolean;
  onClose: () => void;
  onExport: (options: PerlerExportOptions) => void;
}

const gridLineColors = [
  { value: "#007acc", label: "蓝色" },
  { value: "#28a745", label: "绿色" },
  { value: "#dc3545", label: "红色" },
  { value: "#6f42c1", label: "紫色" },
  { value: "#fd7e14", label: "橙色" },
  { value: "#6c757d", label: "灰色" },
];

export function PerlerExportModal({ open, onClose, onExport }: PerlerExportModalProps) {
  const [options, setOptions] = useState<PerlerExportOptions>({
    showGrid: true,
    gridInterval: 10,
    showCoordinates: true,
    showCellNumbers: true,
    gridLineColor: "#007acc",
    includeStats: true,
    exportCsv: false,
  });

  if (!open) return null;

  const update = <K extends keyof PerlerExportOptions>(key: K, value: PerlerExportOptions[K]) => {
    setOptions((prev) => ({ ...prev, [key]: value }));
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content perler-export-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>导出设置</h2>
          <button className="modal-close" onClick={onClose}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <div className="modal-body">
          <label className="perler-export-check">
            <input type="checkbox" checked={options.showGrid} onChange={(e) => update("showGrid", e.target.checked)} />
            显示分隔线
          </label>

          {options.showGrid && (
            <div className="perler-export-sub">
              <label>
                间隔:
                <select value={options.gridInterval} onChange={(e) => update("gridInterval", parseInt(e.target.value, 10))}>
                  <option value={5}>5 格</option>
                  <option value={10}>10 格</option>
                  <option value={20}>20 格</option>
                </select>
              </label>
              <label>
                颜色:
                <select value={options.gridLineColor} onChange={(e) => update("gridLineColor", e.target.value)}>
                  {gridLineColors.map((c) => (
                    <option key={c.value} value={c.value}>{c.label}</option>
                  ))}
                </select>
              </label>
            </div>
          )}

          <label className="perler-export-check">
            <input type="checkbox" checked={options.showCoordinates} onChange={(e) => update("showCoordinates", e.target.checked)} />
            显示坐标轴
          </label>

          <label className="perler-export-check">
            <input type="checkbox" checked={options.showCellNumbers} onChange={(e) => update("showCellNumbers", e.target.checked)} />
            格内显示色号
          </label>

          <label className="perler-export-check">
            <input type="checkbox" checked={options.includeStats} onChange={(e) => update("includeStats", e.target.checked)} />
            包含颜色统计表
          </label>

          <label className="perler-export-check">
            <input type="checkbox" checked={options.exportCsv} onChange={(e) => update("exportCsv", e.target.checked)} />
            同时导出 CSV 数据
          </label>
        </div>

        <div className="modal-footer">
          <button className="btn-cancel" onClick={onClose}>取消</button>
          <button className="btn-primary" onClick={() => { onExport(options); onClose(); }}>
            下载图纸
          </button>
        </div>
      </div>
    </div>
  );
}
