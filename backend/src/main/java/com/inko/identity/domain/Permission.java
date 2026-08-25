package com.inko.identity.domain;

import jakarta.persistence.*;

@Entity
@Table(name = "permissions")
public class Permission {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @Column(nullable = false, length = 60, unique = true)
    private String code;

    @Column(length = 200)
    private String description;

    public Integer getId() {
        return id;
    }

    public String getCode() {
        return code;
    }
}
