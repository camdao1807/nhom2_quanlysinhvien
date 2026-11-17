package com.example.quanlydaotao.n2.entity;

import jakarta.persistence.*;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "students")
public class Student {

    @Id
    @GeneratedValue
    @Column(columnDefinition = "UNIQUEIDENTIFIER")
    private UUID id;

    @Column(nullable = false, unique = true, length = 100)
    private String code;

    @Column(nullable = false, length = 255)
    private String fullName;

    private LocalDate dateOfBirth;

    // Giữ kiểu String để nhận trực tiếp "Nam" / "Nữ" từ giao diện
    @Column(name = "gender", length = 10)
    private String gender;

    @Column(name = "personal_identification_number", length = 20)
    private String personalIdentificationNumber;

    @Column(name = "date_of_issue")
    private LocalDate dateOfIssue;

    @Column(name = "card_place", length = 300)
    private String cardPlace;

    @Column(name = "address", length = 300)
    private String address;

    @Column(name = "current_address", length = 300)
    private String currentAddress;

    @Column(name = "admission_year")
    private LocalDateTime admissionYear;

    @Column(name = "status", length = 50)
    private String status;

    @Column(name = "is_active")
    private Boolean isActive = true;

    @Column(name = "created_at", insertable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at", insertable = false, updatable = false)
    private LocalDateTime updatedAt;

    @Column(name = "deleted_at")
    private LocalDateTime deletedAt;

    // Liên kết với bảng StudentClass (Many-to-One)
    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "student_classe_id")
    private StudentClass studentClass;

    // Constructors
    public Student() {}

    // Getters & Setters
    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }

    public String getCode() { return code; }
    public void setCode(String code) { this.code = code; }

    public String getFullName() { return fullName; }
    public void setFullName(String fullName) { this.fullName = fullName; }

    public LocalDate getDateOfBirth() { return dateOfBirth; }
    public void setDateOfBirth(LocalDate dateOfBirth) { this.dateOfBirth = dateOfBirth; }

    public String getGender() { return gender; }
    public void setGender(String gender) { this.gender = gender; }

    public String getPersonalIdentificationNumber() { return personalIdentificationNumber; }
    public void setPersonalIdentificationNumber(String personalIdentificationNumber) {
        this.personalIdentificationNumber = personalIdentificationNumber;
    }

    public LocalDate getDateOfIssue() { return dateOfIssue; }
    public void setDateOfIssue(LocalDate dateOfIssue) { this.dateOfIssue = dateOfIssue; }

    public String getCardPlace() { return cardPlace; }
    public void setCardPlace(String cardPlace) { this.cardPlace = cardPlace; }

    public String getAddress() { return address; }
    public void setAddress(String address) { this.address = address; }

    public String getCurrentAddress() { return currentAddress; }
    public void setCurrentAddress(String currentAddress) { this.currentAddress = currentAddress; }

    public LocalDateTime getAdmissionYear() { return admissionYear; }
    public void setAdmissionYear(LocalDateTime admissionYear) { this.admissionYear = admissionYear; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public Boolean getIsActive() { return isActive; }
    public void setIsActive(Boolean isActive) { this.isActive = isActive; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public LocalDateTime getUpdatedAt() { return updatedAt; }

    public LocalDateTime getDeletedAt() { return deletedAt; }
    public void setDeletedAt(LocalDateTime deletedAt) { this.deletedAt = deletedAt; }

    public StudentClass getStudentClass() { return studentClass; }
    public void setStudentClass(StudentClass studentClass) { this.studentClass = studentClass; }
}