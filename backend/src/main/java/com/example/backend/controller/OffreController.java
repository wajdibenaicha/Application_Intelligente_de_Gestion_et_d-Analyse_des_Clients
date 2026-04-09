package com.example.backend.controller;

import com.example.backend.Repository.ClientRepository;
import com.example.backend.models.Client;
import com.example.backend.models.Offre;
import com.example.backend.service.OffreService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/offres")
@CrossOrigin(origins = { "http://localhost:4200", "http://localhost:4201" })
public class OffreController {

    @Autowired private OffreService offreService;
    @Autowired private ClientRepository clientRepository;
    @Autowired private JavaMailSender mailSender;

    @GetMapping
    public List<Offre> getAll() {
        return offreService.getAllOffres();
    }

    @PostMapping
    public ResponseEntity<Offre> create(@RequestBody Map<String, Object> body) {
        if (body.get("title") == null || body.get("description") == null) {
            return ResponseEntity.badRequest().build();
        }
        Offre offre = new Offre();
        offre.setTitle(body.get("title").toString());
        offre.setDescription(body.get("description").toString());
        return ResponseEntity.ok(offreService.addOffre(offre));
    }

    @PutMapping("/{id}")
    public ResponseEntity<Offre> update(@PathVariable Long id, @RequestBody Map<String, Object> body) {
        Offre existing = offreService.getOffreById(id);
        if (existing == null) return ResponseEntity.notFound().build();
        if (body.get("title") != null) existing.setTitle(body.get("title").toString());
        if (body.get("description") != null) existing.setDescription(body.get("description").toString());
        return ResponseEntity.ok(offreService.updateOffre(id, existing));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        offreService.deleteOffre(id);
        return ResponseEntity.ok().build();
    }

    /**
     * Send an offer by email to one or more clients.
     * Body: { offreId: number, clientIds: number[] }
     */
    @PostMapping("/envoyer")
    public ResponseEntity<?> envoyerOffre(@RequestBody Map<String, Object> body) {
        Object offreIdObj = body.get("offreId");
        Object clientIdsObj = body.get("clientIds");
        if (offreIdObj == null || clientIdsObj == null) {
            return ResponseEntity.badRequest().body("offreId and clientIds are required");
        }

        Long offreId = Long.valueOf(offreIdObj.toString());
        Offre offre = offreService.getOffreById(offreId);
        if (offre == null) return ResponseEntity.notFound().build();

        @SuppressWarnings("unchecked")
        List<Integer> ids = (List<Integer>) clientIdsObj;
        int sent = 0;
        for (Integer clientIdInt : ids) {
            Client client = clientRepository.findById(clientIdInt.longValue()).orElse(null);
            if (client == null || client.getMail() == null) continue;
            try {
                SimpleMailMessage msg = new SimpleMailMessage();
                msg.setTo(client.getMail());
                msg.setSubject("STAR Assurances – Offre spéciale pour vous : " + offre.getTitle());
                msg.setText(
                    "Bonjour " + client.getFullName() + ",\n\n" +
                    "Nous avons une offre exclusive pour vous :\n\n" +
                    "🎁 " + offre.getTitle() + "\n" +
                    offre.getDescription() + "\n\n" +
                    "N'hésitez pas à nous contacter pour en savoir plus.\n\n" +
                    "Cordialement,\n" +
                    "L'équipe STAR Assurances"
                );
                mailSender.send(msg);
                sent++;
            } catch (Exception ignored) {}
        }

        return ResponseEntity.ok(Map.of("message", "Offre envoyée à " + sent + " client(s).", "sent", sent));
    }
}
