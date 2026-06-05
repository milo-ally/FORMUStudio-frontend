import { useState, useCallback, useRef, useEffect } from "react";
import { submit3DGeneration, query3DJob } from "../lib/api";
import type { ThreeDJob } from "../types";

export interface JobEntry {
  job: ThreeDJob;
}

const IN_FLIGHT_KEY = "in_flight_3d_jobs";

export function use3DGeneration() {
  const [jobs, setJobs] = useState<JobEntry[]>([]);
  const timersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());
  const cancelledRef = useRef<Set<string>>(new Set());
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      timersRef.current.forEach((t) => clearTimeout(t));
      timersRef.current.clear();
    };
  }, []);

  const generating = jobs.some(
    (e) => e.job.status === "WAIT" || e.job.status === "RUN",
  );

  const poll = useCallback((jobId: string) => {
    const run = async () => {
      if (cancelledRef.current.has(jobId) || !mountedRef.current) return;

      try {
        const result = await query3DJob(jobId);

        if (cancelledRef.current.has(jobId) || !mountedRef.current) return;

        if (mountedRef.current) {
          setJobs((prev) =>
            prev.map((e) =>
              e.job.job_id === jobId ? { ...e, job: result } : e,
            ),
          );
        }

        if (result.status === "DONE" || result.status === "FAIL") {
          timersRef.current.delete(jobId);
          return;
        }

        const timer = setTimeout(run, 3000);
        timersRef.current.set(jobId, timer);
      } catch {
        if (mountedRef.current) {
          setJobs((prev) =>
            prev.map((e) =>
              e.job.job_id === jobId
                ? {
                    ...e,
                    job: {
                      ...e.job,
                      status: "FAIL" as const,
                      error_message: "查询任务状态失败",
                    },
                  }
                : e,
            ),
          );
        }
        timersRef.current.delete(jobId);
      }
    };

    // Small initial delay so the WAIT status is visible
    const timer = setTimeout(run, 1000);
    timersRef.current.set(jobId, timer);
  }, []);

  // Recover in-flight jobs after page refresh
  useEffect(() => {
    const saved = localStorage.getItem(IN_FLIGHT_KEY);
    if (!saved) return;
    let ids: string[] = [];
    try { ids = JSON.parse(saved); } catch { return; }
    if (ids.length === 0) return;

    for (const jobId of ids) {
      if (cancelledRef.current.has(jobId)) continue;
      const placeholder: ThreeDJob = {
        job_id: jobId,
        status: "WAIT",
        result_files: [],
        error_code: "",
        error_message: "",
      };
      setJobs((prev) => [...prev, { job: placeholder }]);
      poll(jobId);
    }
  }, [poll]);

  // Persist in-flight (non-tmp) job IDs so they survive refresh
  useEffect(() => {
    const inFlight = jobs
      .filter(
        (e) =>
          (e.job.status === "WAIT" || e.job.status === "RUN") &&
          !e.job.job_id.startsWith("tmp-"),
      )
      .map((e) => e.job.job_id);
    if (inFlight.length > 0) {
      localStorage.setItem(IN_FLIGHT_KEY, JSON.stringify(inFlight));
    } else {
      localStorage.removeItem(IN_FLIGHT_KEY);
    }
  }, [jobs]);

  const startGeneration = useCallback(
    async (
      prompt: string,
      opts: { model?: string; image_url?: string } = {},
    ) => {
      const tempId = "tmp-" + crypto.randomUUID();

      const placeholder: ThreeDJob = {
        job_id: tempId,
        status: "WAIT",
        result_files: [],
        error_code: "",
        error_message: "",
      };

      // Optimistic: show placeholder immediately before the API call
      setJobs((prev) => [...prev, { job: placeholder }]);

      try {
        const { job_id } = await submit3DGeneration(prompt, opts);
        if (!mountedRef.current) return;

        // If placeholder was cancelled/cleared while waiting, propagate to real ID
        if (cancelledRef.current.has(tempId)) {
          cancelledRef.current.add(job_id);
          setJobs((prev) =>
            prev.map((e) =>
              e.job.job_id === tempId
                ? {
                    ...e,
                    job: {
                      ...e.job,
                      job_id,
                      status: "FAIL" as const,
                      error_message: e.job.error_message || "已取消",
                    },
                  }
                : e,
            ),
          );
          return;
        }

        // Swap placeholder for real job and start polling
        setJobs((prev) =>
          prev.map((e) =>
            e.job.job_id === tempId ? { ...e, job: { ...e.job, job_id } } : e,
          ),
        );
        poll(job_id);
      } catch {
        if (mountedRef.current) {
          setJobs((prev) =>
            prev.map((e) =>
              e.job.job_id === tempId
                ? {
                    ...e,
                    job: {
                      ...e.job,
                      status: "FAIL" as const,
                      error_message: "提交任务失败",
                    },
                  }
                : e,
            ),
          );
        }
      }
    },
    [poll],
  );

  const cancelJob = useCallback((jobId: string) => {
    cancelledRef.current.add(jobId);

    const timer = timersRef.current.get(jobId);
    if (timer) {
      clearTimeout(timer);
      timersRef.current.delete(jobId);
    }

    setJobs((prev) =>
      prev.map((e) =>
        e.job.job_id === jobId
          ? {
              ...e,
              job: { ...e.job, status: "FAIL" as const, error_message: "已取消" },
            }
          : e,
      ),
    );
  }, []);

  const clearJob = useCallback((jobId: string) => {
    cancelledRef.current.add(jobId);
    const timer = timersRef.current.get(jobId);
    if (timer) {
      clearTimeout(timer);
      timersRef.current.delete(jobId);
    }
    setJobs((prev) => prev.filter((e) => e.job.job_id !== jobId));
  }, []);

  const clearAllJobs = useCallback(() => {
    timersRef.current.forEach((t) => clearTimeout(t));
    timersRef.current.clear();
    setJobs([]);
    localStorage.removeItem(IN_FLIGHT_KEY);
  }, []);

  return { jobs, generating, startGeneration, cancelJob, clearJob, clearAllJobs };
}
