package com.example.quanlydaotao.n2.service;

import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;

import com.example.quanlydaotao.n2.entity.StudentClass;
import com.example.quanlydaotao.n2.repository.StudentClassRepository;

@Service
public class StudentClassService {

    private final StudentClassRepository studentClassRepository;

    public StudentClassService(StudentClassRepository studentClassRepository) {
        this.studentClassRepository = studentClassRepository;
    }

    public Page<StudentClass> getAllClasses(String search, int page, int size) {
        int safePage = Math.max(page, 0);
        int safeSize = size > 0 ? size : 10;
        Pageable pageable = PageRequest.of(safePage, safeSize);

        if (search != null && !search.trim().isEmpty()) {
            String keyword = search.trim();
            return studentClassRepository.findByCodeContainingIgnoreCaseOrNameContainingIgnoreCase(keyword, keyword,
                    pageable);
        }

        return studentClassRepository.findAll(pageable);
    }

    public StudentClass getClassById(UUID id) {
        return studentClassRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy lớp học với ID: " + id));
    }

    public StudentClass createClass(StudentClass studentClass) {
        if (studentClass.getCode() != null && studentClassRepository.existsByCode(studentClass.getCode())) {
            throw new RuntimeException("Mã lớp đã tồn tại!");
        }
        if (studentClass.getStatus() == null) {
            studentClass.setStatus("on");
        }
        return studentClassRepository.save(studentClass);
    }

    public StudentClass updateClass(UUID id, StudentClass details) {
        StudentClass existingClass = getClassById(id);

        if (details.getCode() != null && !details.getCode().equals(existingClass.getCode())) {
            if (studentClassRepository.existsByCodeAndIdNot(details.getCode(), id)) {
                throw new RuntimeException("Mã lớp đã tồn tại!");
            }
            existingClass.setCode(details.getCode());
        }

        if (details.getName() != null) {
            existingClass.setName(details.getName());
        }
        if (details.getAcademicYearId() != null) {
            existingClass.setAcademicYearId(details.getAcademicYearId());
        }
        if (details.getDepartmentId() != null) {
            existingClass.setDepartmentId(details.getDepartmentId());
        }
        if (details.getStatus() != null) {
            existingClass.setStatus(details.getStatus());
        }
        return studentClassRepository.save(existingClass);
    }

    public void deleteClass(UUID id) {
        StudentClass studentClass = getClassById(id);
        studentClassRepository.delete(studentClass);
    }
}