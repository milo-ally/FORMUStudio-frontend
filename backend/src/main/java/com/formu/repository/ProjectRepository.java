package com.formu.repository;

import com.formu.entity.Project;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ProjectRepository extends JpaRepository<Project, String> {
    List<Project> findByUserIdOrderByCreatedAtDesc(String userId);
    Optional<Project> findByIdAndUserId(String id, String userId);
    boolean existsByIdAndUserId(String id, String userId);
}
