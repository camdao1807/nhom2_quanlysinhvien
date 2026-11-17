package com.example.quanlydaotao.n2.controller;

import com.example.quanlydaotao.n2.entity.Student;
import com.example.quanlydaotao.n2.service.StudentService;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/students")
public class StudentController {

    private final StudentService studentService;
    private final ObjectMapper objectMapper;

    public StudentController(StudentService studentService, ObjectMapper objectMapper) {
        this.studentService = studentService;
        this.objectMapper = objectMapper;
    }

    @SuppressWarnings("unchecked")
    private Map<String, Object> toView(Student s,
                                       Map<String, String[]> classMap,
                                       Map<String, String> statusMap) {
        Map<String, Object> m = objectMapper.convertValue(s, Map.class);
        String key = s.getId().toString().toLowerCase();

        String[] c = classMap.get(key);
        m.put("classCode", c == null ? null : c[0]);
        m.put("className", c == null ? null : c[1]);

        String latest = statusMap.get(key);
        if (latest != null && !latest.isBlank()) {
            m.put("status", latest);
        }
        return m;
    }

    private List<Map<String, Object>> toViews(List<Student> students) {
        Map<String, String[]> classMap = studentService.getClassMap();
        Map<String, String> statusMap = studentService.getStatusMap();
        List<Map<String, Object>> result = new ArrayList<>();
        for (Student s : students) {
            result.add(toView(s, classMap, statusMap));
        }
        return result;
    }

    @GetMapping
    public List<Map<String, Object>> getAllStudents(@RequestParam(required = false) String keyword) {
        List<Student> students = (keyword == null || keyword.trim().isEmpty())
                ? studentService.getAll()
                : studentService.search(keyword);
        return toViews(students);
    }

    // Phải đặt trước /{id}
    @GetMapping("/archived")
    public List<Map<String, Object>> getArchived() {
        return toViews(studentService.getArchived());
    }

    // Phân lớp: body { studentIds: [...], studentClasseId: "..." }
    @PostMapping("/assign-class")
    public ResponseEntity<?> assignClass(@RequestBody Map<String, Object> body) {
        try {
            @SuppressWarnings("unchecked")
            List<Object> raw = (List<Object>) body.get("studentIds");
            List<String> studentIds = new ArrayList<>();
            if (raw != null) {
                for (Object o : raw) studentIds.add(String.valueOf(o));
            }
            Object cid = body.get("studentClasseId");
            if (cid == null || studentIds.isEmpty()) {
                return ResponseEntity.badRequest().body("Thiếu studentIds hoặc studentClasseId");
            }
            studentService.assignClass(studentIds, String.valueOf(cid));
            return ResponseEntity.ok("Đã phân lớp");
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @GetMapping("/{id}")
    public ResponseEntity<Map<String, Object>> getStudentById(@PathVariable UUID id) {
        try {
            Student s = studentService.getById(id);
            return ResponseEntity.ok(toView(s, studentService.getClassMap(), studentService.getStatusMap()));
        } catch (RuntimeException e) {
            return ResponseEntity.notFound().build();
        }
    }

    @PostMapping
    public ResponseEntity<?> createStudent(@RequestBody Student student) {
        try {
            return ResponseEntity.ok(studentService.create(student));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }
    @PutMapping("/{id}")
    public ResponseEntity<?> updateStudent(@PathVariable UUID id, @RequestBody Student student) {
        try {
            studentService.update(id, student);
            Student s = studentService.getById(id);
            return ResponseEntity.ok(toView(s, studentService.getClassMap(), studentService.getStatusMap()));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }
    // Chuyển vào Lưu trữ
    @DeleteMapping("/{id}")
    public ResponseEntity<?> deleteStudent(@PathVariable UUID id) {
        try {
            studentService.delete(id);
            return ResponseEntity.ok("Đã chuyển vào lưu trữ");
        } catch (RuntimeException e) {
            return ResponseEntity.notFound().build();
        }
    }

    // Khôi phục từ Lưu trữ
    @PutMapping("/{id}/restore")
    public ResponseEntity<?> restoreStudent(@PathVariable UUID id) {
        try {
            studentService.restore(id);
            return ResponseEntity.ok("Đã khôi phục sinh viên");
        } catch (RuntimeException e) {
            return ResponseEntity.notFound().build();
        }
    }
}