package com.formu.service;

import com.formu.entity.PerlerPattern;
import com.formu.repository.PerlerPatternRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class PerlerPatternService {
    private final PerlerPatternRepository perlerPatternRepository;

    public List<PerlerPattern> getPatternsByProject(String projectId, String userId) {
        return perlerPatternRepository.findByUserIdAndProjectIdOrderByUpdatedAtDesc(userId, projectId);
    }

    public Optional<PerlerPattern> getPatternById(String id, String userId) {
        return perlerPatternRepository.findByIdAndUserId(id, userId);
    }

    public PerlerPattern createPattern(PerlerPattern pattern, String userId) {
        pattern.setId(UUID.randomUUID().toString());
        pattern.setUserId(userId);
        return perlerPatternRepository.save(pattern);
    }

    public Optional<PerlerPattern> updatePattern(String id, PerlerPattern pattern, String userId) {
        return perlerPatternRepository.findByIdAndUserId(id, userId)
                .map(existing -> {
                    existing.setName(pattern.getName());
                    existing.setImageBase64(pattern.getImageBase64());
                    existing.setGridJson(pattern.getGridJson());
                    existing.setGridN(pattern.getGridN());
                    existing.setGridM(pattern.getGridM());
                    existing.setPixelationMode(pattern.getPixelationMode());
                    existing.setColorSystem(pattern.getColorSystem());
                    existing.setBeadCount(pattern.getBeadCount());
                    existing.setColorCountsJson(pattern.getColorCountsJson());
                    return perlerPatternRepository.save(existing);
                });
    }

    public boolean deletePattern(String id, String userId) {
        return perlerPatternRepository.findByIdAndUserId(id, userId)
                .map(pattern -> {
                    perlerPatternRepository.delete(pattern);
                    return true;
                })
                .orElse(false);
    }
}
