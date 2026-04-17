package com.example.backend.models.dto;
import java.util.List;
import java.util.Map;

public record ReordonnerRequest(
    List<Map<String, Object>> questions
) {}
