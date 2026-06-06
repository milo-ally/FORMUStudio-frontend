package com.formu.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "works", indexes = {
    @Index(name = "idx_works_user", columnList = "userId"),
    @Index(name = "idx_works_project", columnList = "projectId")
})
@Data
@NoArgsConstructor
@AllArgsConstructor
public class Work {
    @Id
    private String id;

    @Column(name = "user_id", nullable = false)
    private String userId;

    @Column(name = "project_id", nullable = false)
    private String projectId;

    @Column(name = "image_base64", columnDefinition = "TEXT")
    private String imageBase64 = "";

    @Column(name = "revised_prompt", columnDefinition = "TEXT")
    private String revisedPrompt = "";

    @Column(name = "created_at", nullable = false)
    private Long createdAt;

    @PrePersist
    protected void onCreate() {
        createdAt = System.currentTimeMillis();
    }
}
