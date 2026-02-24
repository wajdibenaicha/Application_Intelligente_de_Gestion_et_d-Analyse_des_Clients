package com.example.backend.models;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;

@Entity
@Table(name = "role")
public class Role {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    long id ;
    String name ;
     @ManyToOne
    @JoinColumn(name = "idPermission")
    private Permission permission;
    public Role(){

    }
    public long getId(){
        return id;

    }
    public String getName(){
        return name;
    }
    public Permission getPermission(){
        return permission;
    }
    public void setId(long id){
        this.id=id;
    }
    public void setPermission (Permission permission){
        this.permission=permission;
    }
    public void setName (String name){
        this.name=name;
    }
}
