package com.example.backend.models;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;

@Entity
@Table(name = "clients")

public class Client {
     @Id
     @GeneratedValue(strategy = GenerationType.IDENTITY)
    private long id ;
    private String mail;
    private String tel ;
     public Client() {
    }
    public Client (long id , String mail , String tel){
        this.id=id;
        this.mail=mail;
        this.tel=tel;
    }
    public long getId(){
        return id ;
    }
    public String getMail(){
        return mail;
    }
    public String getTel(){
        return tel ;
    }
    public void setId(long id){
        this.id=id ;
    }
     public void setMail(String mail){
        this.mail=mail ;
    }
     public void setTel(String tel){
        this.tel=tel ;
    }

    
}
