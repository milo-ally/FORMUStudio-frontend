package com.formu.controller;

import com.formu.entity.PerlerPattern;
import com.formu.service.PerlerPatternService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/data/perler-patterns")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class PerlerPatternController {
    private final PerlerPatternService perlerPatternService;

    @GetMapping
    public ResponseEntity<List<PerlerPattern>> getPatterns(@RequestParam String projectId, Authentication authentication) {
        String userId = (String) authentication.getPrincipal();
        return ResponseEntity.ok(perlerPatternService.getPatternsByProject(projectId, userId));
    }

    @GetMapping("/{id}")
    public ResponseEntity<PerlerPattern> getPattern(@PathVariable String id, Authentication authentication) {
        String userId = (String) authentication.getPrincipal();
        return perlerPatternService.getPatternById(id, userId)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping
    public ResponseEntity<PerlerPattern> createPattern(@RequestBody PerlerPattern pattern, Authentication authentication) {
        String userId = (String) authentication.getPrincipal();
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(perlerPatternService.createPattern(pattern, userId));
    }

    @PutMapping("/{id}")
    public ResponseEntity<PerlerPattern> updatePattern(@PathVariable String id,
                                                        @RequestBody PerlerPattern pattern,
                                                        Authentication authentication) {
        String userId = (String) authentication.getPrincipal();
        return perlerPatternService.updatePattern(id, pattern, userId)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deletePattern(@PathVariable String id, Authentication authentication) {
        String userId = (String) authentication.getPrincipal();
        if (perlerPatternService.deletePattern(id, userId)) {
            return ResponseEntity.noContent().build();
        }
        return ResponseEntity.notFound().build();
    }
}
