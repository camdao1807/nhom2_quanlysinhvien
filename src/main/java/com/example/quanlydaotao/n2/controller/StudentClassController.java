package com.example.quanlydaotao.n2.controller;

import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.web.bind.annotation.*;

import com.example.quanlydaotao.n2.entity.StudentClass;
import com.example.quanlydaotao.n2.service.StudentClassService;

@RestController
@RequestMapping("/api/student_classes")
public class StudentClassController {

    private final StudentClassService studentClassService;

    public StudentClassController(StudentClassService studentClassService) {
        this.studentClassService = studentClassService;
    }

    // 1. Lấy danh sách lớp học (GET: /api/student-classes?search=...&page=0&size=5)
    @GetMapping
    public Page<StudentClass> listClasses(
            @RequestParam(value = "search", required = false) String search,
            @RequestParam(value = "page", defaultValue = "0") int page,
            @RequestParam(value = "size", defaultValue = "5") int size) {
        return studentClassService.getAllClasses(search, page, size);
    }

    // 2. Lấy chi tiết lớp học theo ID (GET: /api/student-classes/{id})
    @GetMapping("/{id}")
    public StudentClass getClassById(@PathVariable("id") UUID id) {
        return studentClassService.getClassById(id);
    }

    // 3. Thêm mới lớp học (POST: /api/student-classes)
    @PostMapping
    public StudentClass createClass(@RequestBody StudentClass studentClass) {
        return studentClassService.createClass(studentClass);
    }

    // 4. Cập nhật lớp học (PUT: /api/student-classes/{id})
    @PutMapping("/{id}")
    public StudentClass updateClass(@PathVariable("id") UUID id, @RequestBody StudentClass studentClass) {
        return studentClassService.updateClass(id, studentClass);
    }

    // 5. Xóa lớp học (DELETE: /api/student-classes/{id})
    @DeleteMapping("/{id}")
    public String deleteClass(@PathVariable("id") UUID id) {
        studentClassService.deleteClass(id);
        return "Xóa lớp học thành công!";
    }
}