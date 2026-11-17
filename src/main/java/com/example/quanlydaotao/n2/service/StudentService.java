package com.example.quanlydaotao.n2.service;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.example.quanlydaotao.n2.entity.Student;
import com.example.quanlydaotao.n2.repository.StudentRepository;

@Service
public class StudentService {

    private final StudentRepository studentRepository;

    public StudentService(StudentRepository studentRepository) {
        this.studentRepository = studentRepository;
    }

    public List<Student> getAll() {
        return studentRepository.findAllActive();
    }

    public List<Student> getArchived() {
        return studentRepository.findAllArchived();
    }

    public List<Student> search(String keyword) {
        if (keyword == null || keyword.trim().isEmpty()) {
            return getAll();
        }
        return studentRepository.searchActiveStudents(keyword.trim());
    }

    public Student getById(UUID id) {
        return studentRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy sinh viên với id: " + id));
    }

    public Student create(Student student) {
        if (student.getCode() == null || student.getCode().isBlank()) {
            throw new RuntimeException("Vui lòng nhập mã sinh viên");
        }
        if (student.getFullName() == null || student.getFullName().isBlank()) {
            throw new RuntimeException("Vui lòng nhập họ và tên");
        }
        student.setCode(student.getCode().trim());
        student.setFullName(student.getFullName().trim());

        if (studentRepository.existsByCode(student.getCode())) {
            throw new RuntimeException("Mã sinh viên đã tồn tại!");
        }

        student.setId(null);
        student.setIsActive(true);
        student.setDeletedAt(null);
        if (student.getStatus() == null || student.getStatus().isBlank()) {
            student.setStatus("Đang học");
        }
        if (student.getAdmissionYear() == null) {
            student.setAdmissionYear(LocalDateTime.now());
        }
        return studentRepository.save(student);
    }

    // Lưu trữ (xóa ẩn)
    public void delete(UUID id) {
        Student s = getById(id);
        s.setIsActive(false);
        s.setDeletedAt(LocalDateTime.now());
        studentRepository.save(s);
    }

    // Khôi phục từ lưu trữ
    public void restore(UUID id) {
        Student s = getById(id);
        s.setIsActive(true);
        s.setDeletedAt(null);
        studentRepository.save(s);
    }

    // Phân lớp cho nhiều sinh viên
    @Transactional
    public void assignClass(List<String> studentIds, String classId) {
        for (String sid : studentIds) {
            studentRepository.deleteClassOfStudent(sid);
            studentRepository.insertClassOfStudent(sid, classId);
        }
    }

    public Map<String, String[]> getClassMap() {
        Map<String, String[]> map = new HashMap<>();
        for (Object[] r : studentRepository.findAllStudentClassRows()) {
            if (r[0] == null) continue;
            map.putIfAbsent(r[0].toString().toLowerCase(), new String[] {
                    r[1] == null ? null : r[1].toString(),
                    r[2] == null ? null : r[2].toString()
            });
        }
        return map;
    }

    // r[0] = student_id, r[1] = status_code, r[2] = status_name
    public Map<String, String> getStatusMap() {
        Map<String, String> map = new HashMap<>();
        for (Object[] r : studentRepository.findLatestStatusRows()) {
            if (r[0] == null) continue;
            String code = r[1] == null ? "" : r[1].toString().trim().toUpperCase();
            String label = switch (code) {
                case "STUDYING" -> "Đang học";
                case "BAO_LUU" -> "Bảo lưu";
                case "THOI_HOC" -> "Thôi học";
                case "TOT_NGHIEP" -> "Tốt nghiệp";
                default -> (r.length > 2 && r[2] != null) ? r[2].toString() : null;
            };
            if (label != null) {
                map.put(r[0].toString().toLowerCase(), label);
            }
        }
        return map;
    }
        // Cập nhật hồ sơ (không đổi mã SV, không đổi trạng thái học vụ)
    public Student update(UUID id, Student d) {
        Student s = getById(id);

        if (d.getFullName() == null || d.getFullName().isBlank()) {
            throw new RuntimeException("Vui lòng nhập họ và tên");
        }
        s.setFullName(d.getFullName().trim());
        s.setDateOfBirth(d.getDateOfBirth());
        if (d.getGender() != null) s.setGender(d.getGender());
        s.setPersonalIdentificationNumber(d.getPersonalIdentificationNumber());
        s.setDateOfIssue(d.getDateOfIssue());
        s.setCardPlace(d.getCardPlace());
        s.setAddress(d.getAddress());
        s.setCurrentAddress(d.getCurrentAddress());
        if (d.getAdmissionYear() != null) s.setAdmissionYear(d.getAdmissionYear());

        return studentRepository.save(s);
    }
}
