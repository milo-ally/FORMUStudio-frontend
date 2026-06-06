package com.formu.repository;

import com.formu.entity.Work;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface WorkRepository extends JpaRepository<Work, String> {
    List<Work> findByUserIdAndProjectIdOrderByCreatedAtDesc(String userId, String projectId);
    List<Work> findByProjectId(String projectId);
    void deleteByProjectId(String projectId);
}
