package com.example.BusaoRJ.controller;


import com.example.BusaoRJ.model.Onibus;
import com.example.BusaoRJ.service.OnibusService;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/onibus")
@CrossOrigin(origins = "*")
public class OnibusController {

    private final OnibusService onibusService;

    public OnibusController(OnibusService onibusService) {
        this.onibusService = onibusService;
    }

    @GetMapping
    public List<Onibus> getOnibus(
            @RequestParam(required = false) String linha,
            @RequestParam(required = false) Double latMin,
            @RequestParam(required = false) Double latMax,
            @RequestParam(required = false) Double lonMin,
            @RequestParam(required = false) Double lonMax
    ) throws Exception {
        return onibusService.getOnibus(linha, latMin, latMax, lonMin, lonMax);
    }
}
