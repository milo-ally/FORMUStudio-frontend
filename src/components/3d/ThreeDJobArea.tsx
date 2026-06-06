import { useState, lazy, Suspense } from "react";
import type { ThreeDJob } from "../../types";
import type { JobEntry } from "./use3DGeneration";
import { convert3DFormat } from "../../api/api";
import "./ThreeDJobArea.css";

const ModelViewer = lazy(() => import("./ModelViewer"));

interface ThreeDJobAreaProps {
  jobs: JobEntry[];
  onCancelJob: (jobId: string) => void;
  onClearJob: (jobId: string) => void;
  onClearAllJobs: () => void;
}

const CONVERT_FORMATS = ["STL", "USDZ", "MP4", "GIF"];

function truncateId(jobId: string): string {
  if (jobId.length <= 12) return jobId;
  return jobId.slice(0, 6) + "..." + jobId.slice(-6);
}

export function ThreeDJobArea({
  jobs,
  onCancelJob,
  onClearJob,
  onClearAllJobs,
}: ThreeDJobAreaProps) {
  if (jobs.length === 0) return null;

  return (
    <section className="threed-job-area">
      <div className="threed-job-inner">
        <div className="threed-jobs-header">
          <h3>3D 生成任务 ({jobs.length})</h3>
          {jobs.length > 1 && (
            <button className="threed-jobs-clear-all" onClick={onClearAllJobs}>
              清除全部
            </button>
          )}
        </div>
        <div className="threed-jobs-grid">
          {jobs.map((entry) => (
            <JobCard
              key={entry.job.job_id}
              job={entry.job}
              onCancel={() => onCancelJob(entry.job.job_id)}
              onClear={() => onClearJob(entry.job.job_id)}
            />
          ))}
        </div>
      </div>
    </section>
  );
}

interface JobCardProps {
  job: ThreeDJob;
  onCancel: () => void;
  onClear: () => void;
}

function JobCard({ job, onCancel, onClear }: JobCardProps) {
  const [checkedFiles, setCheckedFiles] = useState<Set<string>>(new Set());
  const [convertFormat, setConvertFormat] = useState("STL");
  const [converting, setConverting] = useState(false);
  const [convertedUrl, setConvertedUrl] = useState<string | null>(null);
  const [convertError, setConvertError] = useState("");

  const isRunning = job.status === "WAIT" || job.status === "RUN";
  const isDone = job.status === "DONE";
  const isFail = job.status === "FAIL";

  const objFile = job.result_files.find(
    (f) => f.type === "POSTPROCESS_OBJ" || f.type === "OBJ",
  );
  const mtlFile = job.result_files.find((f) => f.type === "MTL");
  const imageFile = job.result_files.find((f) => f.type === "IMAGE");

  const allChecked =
    job.result_files.length > 0 &&
    checkedFiles.size === job.result_files.length;

  const toggleFile = (url: string) => {
    setCheckedFiles((prev) => {
      const next = new Set(prev);
      if (next.has(url)) next.delete(url);
      else next.add(url);
      return next;
    });
  };

  const toggleAll = () => {
    if (allChecked) {
      setCheckedFiles(new Set());
    } else {
      setCheckedFiles(new Set(job.result_files.map((f) => f.url)));
    }
  };

  const downloadFile = (url: string) => {
    const a = document.createElement("a");
    a.href = url;
    a.download = "";
    a.target = "_blank";
    a.rel = "noopener noreferrer";
    a.click();
  };

  const downloadChecked = () => {
    job.result_files
      .filter((f) => checkedFiles.has(f.url))
      .forEach((f) => downloadFile(f.url));
  };

  const handleConvert = async () => {
    if (!objFile) return;
    setConverting(true);
    setConvertError("");
    setConvertedUrl(null);
    try {
      const { result_url } = await convert3DFormat(objFile.url, convertFormat);
      setConvertedUrl(result_url);
    } catch {
      setConvertError("格式转换失败，请重试");
    } finally {
      setConverting(false);
    }
  };

  return (
    <div className={`threed-job-card threed-job-card--${job.status.toLowerCase()}`}>
      <div className="threed-job-card-header">
        <span className="threed-job-card-id" title={job.job_id}>
          {truncateId(job.job_id)}
        </span>
        <span className={`threed-job-card-status status-${job.status.toLowerCase()}`}>
          {job.status}
        </span>
      </div>

      <div className="threed-job-card-body">
        {/* Running state */}
        {isRunning && (
          <div className="threed-job-loading">
            <div className="threed-job-spinner">
              <div className="spinner-triple">
                <span className="spinner-dot" />
                <span className="spinner-dot" />
                <span className="spinner-dot" />
              </div>
            </div>
            <p className="threed-job-status-text">
              {job.status === "WAIT" ? "任务排队中..." : "3D 模型生成中..."}
            </p>
            <button className="prompt-cancel-btn" onClick={onCancel}>
              取消生成
            </button>
          </div>
        )}

        {/* Failure */}
        {isFail && (
          <div className="threed-job-error">
            <div className="threed-job-error-icon">!</div>
            <h3>生成失败</h3>
            {job.error_message && (
              <p className="threed-job-error-msg">{job.error_message}</p>
            )}
            {job.error_code && (
              <p className="threed-job-error-code">错误码: {job.error_code}</p>
            )}
            <button className="threed-job-clear-btn" onClick={onClear}>
              清除
            </button>
          </div>
        )}

        {/* Done */}
        {isDone && (
          <div className="threed-job-done">
            {/* Preview image */}
            {imageFile && (
              <div className="threed-preview-image-wrap">
                <img
                  className="threed-preview-image"
                  src={imageFile.url}
                  alt="3D model preview"
                />
              </div>
            )}

            {/* 3D Viewer */}
            {objFile && (
              <div className="threed-viewer-wrap">
                <Suspense fallback={<ModelViewerFallback />}>
                  <ModelViewer
                    objUrl={objFile.url}
                    mtlUrl={mtlFile?.url}
                  />
                </Suspense>
              </div>
            )}

            {/* File list */}
            <div className="threed-files-section">
              <div className="threed-files-header">
                <h4>生成文件</h4>
                <button className="threed-files-toggle-all" onClick={toggleAll}>
                  {allChecked ? "取消全选" : "全选"}
                </button>
              </div>

              <div className="threed-files-list">
                {job.result_files.map((f) => (
                  <label key={f.url} className="threed-file-item">
                    <input
                      type="checkbox"
                      checked={checkedFiles.has(f.url)}
                      onChange={() => toggleFile(f.url)}
                    />
                    <span className="threed-file-type">{f.type}</span>
                    <button
                      className="threed-file-dl"
                      onClick={(e) => {
                        e.preventDefault();
                        downloadFile(f.url);
                      }}
                    >
                      下载
                    </button>
                  </label>
                ))}
              </div>

              {checkedFiles.size > 0 && (
                <button className="threed-dl-selected-btn" onClick={downloadChecked}>
                  下载所选 ({checkedFiles.size})
                </button>
              )}
            </div>

            {/* Format conversion */}
            {objFile && (
              <div className="threed-convert-section">
                <h4>格式转换</h4>
                <div className="threed-convert-row">
                  <select
                    className="threed-convert-select"
                    value={convertFormat}
                    onChange={(e) => setConvertFormat(e.target.value)}
                  >
                    {CONVERT_FORMATS.map((fmt) => (
                      <option key={fmt} value={fmt}>
                        {fmt}
                      </option>
                    ))}
                  </select>
                  <button
                    className="threed-convert-btn"
                    disabled={converting}
                    onClick={handleConvert}
                  >
                    {converting ? "转换中..." : "转换"}
                  </button>
                </div>

                {convertError && (
                  <p className="threed-convert-error">{convertError}</p>
                )}
                {convertedUrl && (
                  <div className="threed-convert-result">
                    <span>转换完成</span>
                    <button
                      className="threed-file-dl"
                      onClick={() => downloadFile(convertedUrl)}
                    >
                      下载 {convertFormat}
                    </button>
                  </div>
                )}
              </div>
            )}

            <button className="threed-job-clear-btn" onClick={onClear}>
              清除
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function ModelViewerFallback() {
  return (
    <div className="threed-viewer-fallback">
      <div className="spinner-triple">
        <span className="spinner-dot" />
        <span className="spinner-dot" />
        <span className="spinner-dot" />
      </div>
      <p>加载 3D 查看器...</p>
    </div>
  );
}
