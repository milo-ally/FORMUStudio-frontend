package com.formu.controller;

import com.formu.entity.Work;
import com.formu.service.WorkService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/data/works")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class WorkController {
    private final WorkService workService;

    @GetMapping
    public ResponseEntity<List<Work>> getWorks(@RequestParam String projectId, Authentication authentication) {
        String userId = (String) authentication.getPrincipal();
        return ResponseEntity.ok(workService.getWorksByProject(projectId, userId));
    }

    @PostMapping
    public ResponseEntity<Work> createWork(@RequestBody Map<String, Object> request, Authentication authentication) {
        String userId = (String) authentication.getPrincipal();
        String projectId = (String) request.get("projectId");
        String imageBase64 = (String) request.get("imageBase64");
        String revisedPrompt = (String) request.get("revisedPrompt");
        
        if (projectId == null) {
            return ResponseEntity.badRequest().build();
        }
        
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(workService.createWork(projectId, imageBase64, revisedPrompt, userId));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteWork(@PathVariable String id, Authentication authentication) {
        String userId = (String) authentication.getPrincipal();
        if (workService.deleteWork(id, userId)) {
            return ResponseEntity.noContent().build();
        }
        return ResponseEntity.notFound().build();
    }
}
