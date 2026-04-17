package com.example.backend.service;

import com.example.backend.Repository.QuestionPredefinieRepository;
import com.example.backend.models.QuestionPredefinie;
import com.example.backend.models.RoleQuestionnaire;
import jakarta.annotation.PostConstruct;
import org.springframework.stereotype.Component;

@Component
public class DataInitializer {

    private final QuestionPredefinieRepository repo;

    public DataInitializer(QuestionPredefinieRepository repo) {
        this.repo = repo;
    }

    @PostConstruct
    public void seed() {
        if (repo.count() > 0) return; 

        
        save("Comment évaluez-vous la qualité globale de nos services ?",
                     "Choix unique", "Excellent,Bon,Moyen,Mauvais",
             RoleQuestionnaire.SATISFACTION_CLIENT,
             "Qualité service", 1, true);

        save("Êtes-vous satisfait(e) du délai de traitement de vos demandes ?",
             "Choix unique", "Très satisfait,Satisfait,Insatisfait,Très insatisfait",
             RoleQuestionnaire.SATISFACTION_CLIENT,
             "Réactivité", 2, true);

        save("Recommanderiez-vous nos services à un proche ?",
             "Choix unique", "Certainement,Probablement,Peut-être,Probablement pas,Non",
             RoleQuestionnaire.SATISFACTION_CLIENT,
             "Recommandation", 3, true);

        save("Quel aspect de nos services appréciez-vous le plus ?",
             "Choix multiple",
             "Prix,Qualité,Service client,Rapidité,Couverture",
             RoleQuestionnaire.SATISFACTION_CLIENT,
             "Points forts", 4, false);

        save("Avez-vous des suggestions d'amélioration ?",
             "Texte libre", null,
             RoleQuestionnaire.SATISFACTION_CLIENT,
             "Suggestions", 5, false);

        // ── FIDELISATION ──
        save("Pensez-vous renouveler votre contrat avec nous ?",
             "Choix unique",
             "Certainement,Probablement,Pas sûr,Probablement pas,Non",
             RoleQuestionnaire.FIDELISATION,
             "Fidélité", 1, true);

        save("Avez-vous comparé nos offres avec la concurrence ?",
             "Choix unique", "Oui,Non",
             RoleQuestionnaire.FIDELISATION,
             "Comparaison", 2, false);

        // ── PROSPECTION ──
        save("Quel type de couverture recherchez-vous ?",
             "Choix multiple",
             "Santé,Vie,Auto,Habitation,Professionnel",
             RoleQuestionnaire.PROSPECTION,
             "Besoins", 1, true);

        System.out.println("[DataInitializer] Questions prédéfinies insérées.");
    }

    private void save(String titre, String type, String options,
                      RoleQuestionnaire role, String categorie,
                      int ordre, boolean obligatoire) {
        QuestionPredefinie q = new QuestionPredefinie();
        q.setTitre(titre);
        q.setType(type);
        q.setOptions(options);
        q.setRoleQuestionnaire(role);
        q.setCategorie(categorie);
        q.setOrdreRecommande(ordre);
        q.setObligatoire(obligatoire);
        repo.save(q);
    }
}

