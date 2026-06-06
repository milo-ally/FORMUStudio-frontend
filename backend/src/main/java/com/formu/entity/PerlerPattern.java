package com.formu.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "perler_patterns", indexes = {
    @Index(name = "idx_perler_patterns_user", columnList = "userId"),
    @Index(name = "idx_perler_patterns_project", columnList = "projectId")
})
@Data
@NoArgsConstructor
@AllArgsConstructor
public class PerlerPattern {
    @Id
    private String id;

    @Column(name = "user_id", nullable = false)
    private String userId;

    @Column(name = "project_id", nullable = false)
    private String projectId;

    private String name = "";

    @Column(name = "image_base64", columnDefinition = "TEXT")
    private String imageBase64 = "";

    @Column(name = "grid_json", columnDefinition = "TEXT", nullable = false)
    private String gridJson = "[]";

    @Column(name = "grid_n")
    private Integer gridN = 50;

    @Column(name = "grid_m")
    private Integer gridM = 50;

    @Column(name = "pixelation_mode")
    private String pixelationMode = "dominant";

    @Column(name = "color_system")
    private String colorSystem = "MARD";

    @Column(name = "bead_count")
    private Integer beadCount = 0;

    @Column(name = "color_counts_json", columnDefinition = "TEXT")
    private String colorCountsJson = "{}";

    @Column(name = "created_at", nullable = false)
    private Long createdAt;

    @Column(name = "updated_at", nullable = false)
    private Long updatedAt;

    @PrePersist
    protected void onCreate() {
        long now = System.currentTimeMillis();
        createdAt = now;
        updatedAt = now;
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = System.currentTimeMillis();
    }
}
