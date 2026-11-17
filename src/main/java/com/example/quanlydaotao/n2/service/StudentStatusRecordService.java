package com.example.quanlydaotao.n2.service;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import com.example.quanlydaotao.n2.entity.StudentStatusRecord;
import com.example.quanlydaotao.n2.repository.StudentStatusRecordRepository;

@Service
public class StudentStatusRecordService {

    private final StudentStatusRecordRepository repository;

    public StudentStatusRecordService(StudentStatusRecordRepository repository) {
        this.repository = repository;
    }

    // Phương thức save() để tương thích với Controller của bạn
    public StudentStatusRecord save(StudentStatusRecord record) {
        if (record.getId() != null && repository.existsById(record.getId())) {
            StudentStatusRecord existing = getById(record.getId());
            existing.setStudentId(record.getStudentId());
            existing.setCode(record.getCode() != null ? record.getCode() : record.getStatusCode());
            existing.setName(record.getName() != null ? record.getName() : record.getStatusName());
            existing.setAcademicYearId(record.getAcademicYearId());
            existing.setDepartmentId(record.getDepartmentId());
            existing.setMajorId(record.getMajorId());
            existing.setTrainingProgramId(record.getTrainingProgramId());
            existing.setEmployeeId(record.getEmployeeId());
            existing.setUpdatedBy(record.getUpdatedBy());
            existing.setIsActive(record.getIsActive());
            return repository.save(existing);
        }
        return repository.save(record);
    }

    public List<StudentStatusRecord> getAll() {
        return repository.findByDeletedAtIsNull();
    }

    public List<StudentStatusRecord> findAll() {
        return getAll();
    }

    public StudentStatusRecord getById(UUID id) {
        return repository.findByIdAndDeletedAtIsNull(id)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND, "Không tìm thấy trạng thái sinh viên với id: " + id));
    }

    public Optional<StudentStatusRecord> findById(UUID id) {
        return repository.findByIdAndDeletedAtIsNull(id);
    }

    public List<StudentStatusRecord> getByStudentId(UUID studentId) {
        return repository.findByStudentIdAndDeletedAtIsNull(studentId);
    }

    public List<StudentStatusRecord> findByStudentId(UUID studentId) {
        return getByStudentId(studentId);
    }

    public StudentStatusRecord create(StudentStatusRecord record) {
        return save(record);
    }

    public StudentStatusRecord update(UUID id, StudentStatusRecord updatedRecord) {
        updatedRecord.setId(id);
        return save(updatedRecord);
    }

    public void delete(UUID id) {
        deleteById(id);
    }

    public void deleteById(UUID id) {
        StudentStatusRecord existing = getById(id);
        existing.setDeletedAt(LocalDateTime.now());
        existing.setIsActive(false);
        repository.save(existing);
    }
}