package com.formu.service;

import com.formu.entity.Work;
import com.formu.repository.WorkRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class WorkService {
    private final WorkRepository workRepository;
    private final ProjectService projectService;

    public List<Work> getWorksByProject(String projectId, String userId) {
        return workRepository.findByUserIdAndProjectIdOrderByCreatedAtDesc(userId, projectId);
    }

    @Transactional
    public Work createWork(String projectId, String imageBase64, String revisedPrompt, String userId) {
        Work work = new Work();
        work.setId(UUID.randomUUID().toString());
        work.setUserId(userId);
        work.setProjectId(projectId);
        work.setImageBase64(imageBase64 != null ? imageBase64 : "");
        work.setRevisedPrompt(revisedPrompt != null ? revisedPrompt : "");
        
        Work savedWork = workRepository.save(work);
        projectService.updateProjectImageCount(projectId, 1);
        return savedWork;
    }

    @Transactional
    public boolean deleteWork(String id, String userId) {
        return workRepository.findById(id)
                .filter(work -> work.getUserId().equals(userId))
                .map(work -> {
                    String projectId = work.getProjectId();
                    workRepository.delete(work);
                    projectService.updateProjectImageCount(projectId, -1);
                    return true;
                })
                .orElse(false);
    }
}
