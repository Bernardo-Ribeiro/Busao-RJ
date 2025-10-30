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
        if (cache == null || now - lastUpdate > 30000) {
            var client = HttpClient.newHttpClient();
            var request = HttpRequest.newBuilder()
                    .uri(URI.create(API_URL))
                    .GET()
                    .build();
            var response = client.send(request, HttpResponse.BodyHandlers.ofString());
            // A API pode retornar latitude/longitude como string com vírgula decimal.
            // Fazemos a normalização manual antes de popular o cache tipado.
            var rawList = mapper.readValue(response.body(), new TypeReference<List<java.util.Map<String, Object>>>() {});
            cache = rawList.stream().map(item -> {
                var o = new Onibus();
                Object ordem = item.get("ordem");
                Object linhaObj = item.get("linha");
                Object latObj = item.get("latitude");
                Object lonObj = item.get("longitude");

                o.setOrdem(ordem == null ? null : String.valueOf(ordem));
                o.setLinha(linhaObj == null ? null : String.valueOf(linhaObj));
                o.setLatitude(parseToDouble(latObj));
                o.setLongitude(parseToDouble(lonObj));
                return o;
            }).toList();
            lastUpdate = now;
        }

        return cache.stream()
                .filter(o -> linha == null || linha.equalsIgnoreCase(o.getLinha()))
                .filter(o -> latMin == null || (o.getLatitude() >= latMin && o.getLatitude() <= latMax))
                .filter(o -> lonMin == null || (o.getLongitude() >= lonMin && o.getLongitude() <= lonMax))
                .collect(Collectors.toList());
    }

    private static double parseToDouble(Object v) {
        if (v == null) return 0.0;
        if (v instanceof Number n) return n.doubleValue();
        String s = String.valueOf(v).trim();
        if (s.isEmpty()) return 0.0;
        // normaliza vírgula para ponto
        s = s.replace(',', '.');
        try { return Double.parseDouble(s); } catch (NumberFormatException e) { return 0.0; }
    }
}
