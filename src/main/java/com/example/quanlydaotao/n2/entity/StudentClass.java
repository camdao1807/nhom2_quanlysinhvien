package com.example.quanlydaotao.n2.entity;

import java.util.UUID;
import jakarta.persistence.*;

@Entity
@Table(name = "student_classes")
public class StudentClass {

    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    private UUID id;

    @Column(name = "status")
    private String status = "on";

    @Column(name = "code", unique = true)
    private String code;

    @Column(name = "name")
    private String name;

    @Column(name = "max_size")
    private Integer maxSize = 40;

    @Column(name = "academic_year_id")
    private UUID academicYearId;

    @Column(name = "department_id")
    private UUID departmentId;

    public StudentClass() {
    }

    public StudentClass(String code, String name, UUID academicYearId, UUID departmentId) {
        this.code = code;
        this.name = name;
        this.academicYearId = academicYearId;
        this.departmentId = departmentId;
    }

    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }

    public String getCode() { return code; }
    public void setCode(String code) { this.code = code; }

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public Integer getMaxSize() { return maxSize; }
    public void setMaxSize(Integer maxSize) { this.maxSize = maxSize; }

    public UUID getAcademicYearId() { return academicYearId; }
    public void setAcademicYearId(UUID academicYearId) { this.academicYearId = academicYearId; }

    public UUID getDepartmentId() { return departmentId; }
    public void setDepartmentId(UUID departmentId) { this.departmentId = departmentId; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }
}