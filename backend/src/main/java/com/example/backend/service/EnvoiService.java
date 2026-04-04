package com.example.backend.service;

import com.example.backend.Repository.ClientRepository;
import com.example.backend.Repository.EnvoiQuestionnaireRepository;
import com.example.backend.models.Client;
import com.example.backend.models.EnvoiQuestionnaire;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import javax.crypto.Cipher;
import javax.crypto.KeyGenerator;
import javax.crypto.SecretKey;
import java.util.Base64;
import java.util.List;
import java.util.Map;

@Service
public class EnvoiService {
    @Autowired
    private EnvoiQuestionnaireRepository envoiRepository;
    @Autowired
    private ClientRepository clientRepository;

    private static final String ALGO = "AES";
    private static SecretKey key;
    static {
        try {
            KeyGenerator kg = KeyGenerator.getInstance(ALGO);
            kg.init(128);
            key = kg.generateKey();
        } catch (Exception e) {
            e.printStackTrace();
        }
    }

    public String genererLienChiffre(Long questionnaireId, Long clientId) {
        try {
            String data = questionnaireId + "|" + clientId;
            Cipher cipher = Cipher.getInstance(ALGO);
            cipher.init(Cipher.ENCRYPT_MODE, key);
            byte[] encrypted = cipher.doFinal(data.getBytes());
            String token = Base64.getUrlEncoder().encodeToString(encrypted);
            EnvoiQuestionnaire envoi = new EnvoiQuestionnaire();
            envoi.setQuestionnaireId(questionnaireId);
            envoi.setClientId(clientId);
            envoi.setToken(token);
            envoiRepository.save(envoi);
            return "http://localhost:4200/repondre?token=" + token;
        } catch (Exception e) {
            return null;
        }
    }

    public List<Client> filtrerClients(String typeContrat, Integer anneeMin, String profession) {
        List<Client> all = clientRepository.findAll();
        return all.stream().filter(c -> {
            if (typeContrat != null && !typeContrat.isEmpty() && !typeContrat.equals(c.getTypeContrat()))
                return false;
            if (anneeMin != null && c.getAnneeInscription() < anneeMin)
                return false;
            if (profession != null && !profession.isEmpty() && !profession.equals(c.getProfession()))
                return false;
            return true;
        }).toList();
    }

    public boolean traiterReponse(String token, List<Map<String, Object>> reponses) {
        try {
            Cipher cipher = Cipher.getInstance(ALGO);
            cipher.init(Cipher.DECRYPT_MODE, key);
            byte[] decoded = Base64.getUrlDecoder().decode(token);
            byte[] decrypted = cipher.doFinal(decoded);
            String[] parts = new String(decrypted).split("\\|");
            Long questionnaireId = Long.parseLong(parts[0]);
            Long clientId = Long.parseLong(parts[1]);
            return true;
        } catch (Exception e) {
            e.printStackTrace();
            return false;
        }
    }
}