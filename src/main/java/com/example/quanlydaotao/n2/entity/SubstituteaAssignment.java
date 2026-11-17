package com.example.quanlydaotao.n2.entity;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

@Entity
@Table(name = "substitute_assignments", schema = "dbo")
public class SubstituteaAssignment {

    public static final String ASSIGNED = "ASSIGNED";
    public static final String COMPLETED = "COMPLETED";

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "id", nullable = false)
    private UUID id;

    @NotNull(message = "Ngày dạy không được để trống")
    @Column(name = "teaching_date", nullable = false)
    private LocalDate teachingDate;

    @NotNull(message = "ID lớp học không được để trống")
    @Column(name = "student_classe_id", nullable = false)
    private UUID studentClasseId;

    @NotNull(message = "ID giáo viên chính không được để trống")
    @Column(name = "main_employee_id", nullable = false)
    private UUID mainEmployeeId;

    @NotNull(message = "ID giáo viên dạy thay không được để trống")
    @Column(name = "substitute_employee_id", nullable = false)
    private UUID substituteEmployeeId;

    @Column(name = "status", nullable = false, length = 20)
    private String status = ASSIGNED;

    @Size(max = 500, message = "Ghi chú tối đa 500 ký tự")
    @Column(name = "note", length = 500)
    private String note;

    @Column(name = "confirmed_at")
    private LocalDateTime confirmedAt;

    @Column(name = "confirmed_by")
    private UUID confirmedBy;

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @Column(name = "created_by")
    private UUID createdBy;

    @Column(name = "updated_by")
    private UUID updatedBy;

    @Column(name = "deleted_at")
    private LocalDateTime deletedAt;

    @Column(name = "deleted_by")
    private UUID deletedBy;

    @Column(name = "is_active")
    private Boolean isActive = true;

    @PrePersist
    protected void onCreate() {
        if (createdAt == null) createdAt = LocalDateTime.now();
        if (isActive == null) isActive = true;
        if (status == null) status = ASSIGNED;
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }

    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }

    public LocalDate getTeachingDate() { return teachingDate; }
    public void setTeachingDate(LocalDate teachingDate) { this.teachingDate = teachingDate; }

    public UUID getStudentClasseId() { return studentClasseId; }
    public void setStudentClasseId(UUID studentClasseId) { this.studentClasseId = studentClasseId; }

    public UUID getMainEmployeeId() { return mainEmployeeId; }
    public void setMainEmployeeId(UUID mainEmployeeId) { this.mainEmployeeId = mainEmployeeId; }

    public UUID getSubstituteEmployeeId() { return substituteEmployeeId; }
    public void setSubstituteEmployeeId(UUID substituteEmployeeId) { this.substituteEmployeeId = substituteEmployeeId; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public String getNote() { return note; }
    public void setNote(String note) { this.note = note; }

    public LocalDateTime getConfirmedAt() { return confirmedAt; }
    public void setConfirmedAt(LocalDateTime confirmedAt) { this.confirmedAt = confirmedAt; }

    public UUID getConfirmedBy() { return confirmedBy; }
    public void setConfirmedBy(UUID confirmedBy) { this.confirmedBy = confirmedBy; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }

    public LocalDateTime getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(LocalDateTime updatedAt) { this.updatedAt = updatedAt; }

    public UUID getCreatedBy() { return createdBy; }
    public void setCreatedBy(UUID createdBy) { this.createdBy = createdBy; }

    public UUID getUpdatedBy() { return updatedBy; }
    public void setUpdatedBy(UUID updatedBy) { this.updatedBy = updatedBy; }

    public LocalDateTime getDeletedAt() { return deletedAt; }
    public void setDeletedAt(LocalDateTime deletedAt) { this.deletedAt = deletedAt; }

    public UUID getDeletedBy() { return deletedBy; }
    public void setDeletedBy(UUID deletedBy) { this.deletedBy = deletedBy; }

    public Boolean getIsActive() { return isActive; }
    public void setIsActive(Boolean isActive) { this.isActive = isActive; }
}