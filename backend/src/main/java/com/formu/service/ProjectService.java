package com.formu.service;

import com.formu.entity.Project;
import com.formu.entity.Work;
import com.formu.repository.ProjectRepository;
import com.formu.repository.WorkRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class ProjectService {
    private final ProjectRepository projectRepository;
    private final WorkRepository workRepository;

    public List<Project> getUserProjects(String userId) {
        return projectRepository.findByUserIdOrderByCreatedAtDesc(userId);
    }

    public Optional<Project> getProjectById(String id, String userId) {
        return projectRepository.findByIdAndUserId(id, userId);
    }

    public Project createProject(String name, String userId) {
        Project project = new Project();
        project.setId(UUID.randomUUID().toString());
        project.setUserId(userId);
        project.setName(name);
        return projectRepository.save(project);
    }

    public Optional<Project> updateProject(String id, String name, String userId) {
        return projectRepository.findByIdAndUserId(id, userId)
                .map(project -> {
                    project.setName(name);
                    return projectRepository.save(project);
                });
    }

    @Transactional
    public boolean deleteProject(String id, String userId) {
        Optional<Project> projectOpt = projectRepository.findByIdAndUserId(id, userId);
        if (projectOpt.isEmpty()) {
            return false;
        }
        workRepository.deleteByProjectId(id);
        projectRepository.delete(projectOpt.get());
        return true;
    }

    public void updateProjectImageCount(String projectId, int delta) {
        projectRepository.findById(projectId).ifPresent(project -> {
            project.setImageCount(Math.max(0, project.getImageCount() + delta));
            projectRepository.save(project);
        });
    }
}
