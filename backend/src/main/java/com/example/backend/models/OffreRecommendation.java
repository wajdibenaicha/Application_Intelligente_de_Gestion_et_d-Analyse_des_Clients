package com.example.backend.models;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "offre_recommendation")
public class OffreRecommendation {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "client_kpi_id", nullable = false)
    private ClientKpi clientKpi;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "ai_offre_id")
    private Offre aiRecommendedOffre;

    @Column(columnDefinition = "TEXT")
    private String aiReason;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "final_offre_id")
    private Offre finalOffre;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private RecommendationStatus status = RecommendationStatus.PENDING;

    private LocalDateTime sentAt;
    private LocalDateTime createdAt = LocalDateTime.now();
public Long getId() {
    return id;
}

public void setId(Long id) {
    this.id = id;
}

public ClientKpi getClientKpi() {
    return clientKpi;
}

public void setClientKpi(ClientKpi clientKpi) {
    this.clientKpi = clientKpi;
}

public Offre getAiRecommendedOffre() {
    return aiRecommendedOffre;
}

public void setAiRecommendedOffre(Offre aiRecommendedOffre) {
    this.aiRecommendedOffre = aiRecommendedOffre;
}

public String getAiReason() {
    return aiReason;
}

public void setAiReason(String aiReason) {
    this.aiReason = aiReason;
}

public Offre getFinalOffre() {
    return finalOffre;
}

public void setFinalOffre(Offre finalOffre) {
    this.finalOffre = finalOffre;
}

public RecommendationStatus getStatus() {
    return status;
}

public void setStatus(RecommendationStatus status) {
    this.status = status;
}

public LocalDateTime getSentAt() {
    return sentAt;
}

public void setSentAt(LocalDateTime sentAt) {
    this.sentAt = sentAt;
}

public LocalDateTime getCreatedAt() {
    return createdAt;
}

public void setCreatedAt(LocalDateTime createdAt) {
    this.createdAt = createdAt;
}
}
