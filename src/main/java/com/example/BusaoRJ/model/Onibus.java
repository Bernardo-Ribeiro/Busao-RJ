package com.example.BusaoRJ.model;

public class Onibus {
    private String ordem;
    private String linha;
    private double latitude;
    private double longitude;

    // Getters e setters
    public String getOrdem() { return ordem; }
    public void setOrdem(String ordem) { this.ordem = ordem; }

    public String getLinha() { return linha; }
    public void setLinha(String linha) { this.linha = linha; }

    public double getLatitude() { return latitude; }
    public void setLatitude(double latitude) { this.latitude = latitude; }

    public double getLongitude() { return longitude; }
    public void setLongitude(double longitude) { this.longitude = longitude; }
}
