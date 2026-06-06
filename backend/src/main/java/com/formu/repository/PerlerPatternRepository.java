package com.formu.repository;

import com.formu.entity.PerlerPattern;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface PerlerPatternRepository extends JpaRepository<PerlerPattern, String> {
    List<PerlerPattern> findByUserIdAndProjectIdOrderByUpdatedAtDesc(String userId, String projectId);
    Optional<PerlerPattern> findByIdAndUserId(String id, String userId);
}
