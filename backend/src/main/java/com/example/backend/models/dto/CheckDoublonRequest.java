package com.example.backend.models.dto;
import java.util.List;

public record CheckDoublonRequest(
    String titre,
    String roleQuestionnaire,
    Long questionnaireId,
    List<String> existingTitles
) {}
