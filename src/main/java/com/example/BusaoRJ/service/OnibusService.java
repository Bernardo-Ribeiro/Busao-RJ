package com.example.BusaoRJ.service;


import com.example.BusaoRJ.model.Onibus;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.stereotype.Service;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.util.List;
import java.util.stream.Collectors;

@Service
public class OnibusService {

    private static final String API_URL = "https://dados.mobilidade.rio/gps/sppo";
    private List<Onibus> cache;
    private long lastUpdate = 0;
    private final ObjectMapper mapper = new ObjectMapper();

    public List<Onibus> getOnibus(String linha, Double latMin, Double latMax, Double lonMin, Double lonMax) throws Exception {
        long now = System.currentTimeMillis();
        if (cache == null || now - lastUpdate > 60000) {
            var client = HttpClient.newHttpClient();
            var request = HttpRequest.newBuilder()
                    .uri(URI.create(API_URL))
                    .GET()
                    .build();
            var response = client.send(request, HttpResponse.BodyHandlers.ofString());
            cache = mapper.readValue(response.body(), new TypeReference<>() {});
            lastUpdate = now;
        }

        return cache.stream()
                .filter(o -> linha == null || linha.equalsIgnoreCase(o.getLinha()))
                .filter(o -> latMin == null || (o.getLatitude() >= latMin && o.getLatitude() <= latMax))
                .filter(o -> lonMin == null || (o.getLongitude() >= lonMin && o.getLongitude() <= lonMax))
                .collect(Collectors.toList());
    }
}
