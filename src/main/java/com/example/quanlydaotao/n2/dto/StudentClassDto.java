package com.example.quanlydaotao.n2.dto;

public class StudentClassDto {
    private Long id;
    private String classCode; // Mã lớp
    private String className; // Tên lớp
    private String description;

    // Constructor không tham số
    public StudentClassDto() {
    }

    // Constructor đầy đủ tham số
    public StudentClassDto(Long id, String classCode, String className, String description) {
        this.id = id;
        this.classCode = classCode;
        this.className = className;
        this.description = description;
    }

    // Getters & Setters
    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getClassCode() {
        return classCode;
    }

    public void setClassCode(String classCode) {
        this.classCode = classCode;
    }

    public String getClassName() {
        return className;
    }

    public void setClassName(String className) {
        this.className = className;
    }

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
    }
}