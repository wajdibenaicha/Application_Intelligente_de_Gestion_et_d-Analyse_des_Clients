package com.example.backend.models.dto;

import java.util.List;

public record AnalyserQuestionRequest(
    String titre,
    String type,
    List<String> existingTitles,
    List<String> selectedTitles
) {}
