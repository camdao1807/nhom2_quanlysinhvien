package com.example.quanlydaotao.n2.controller;

import java.util.List;
import java.util.UUID;

import jakarta.validation.Valid;

import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.example.quanlydaotao.n2.entity.SubstituteaAssignment;
import com.example.quanlydaotao.n2.service.SubstituteaAssignmentService;

@RestController
@RequestMapping("/api/substitute-assignments")
public class SubstituteaAssignmentController {

    private final SubstituteaAssignmentService service;

    public SubstituteaAssignmentController(SubstituteaAssignmentService service) {
        this.service = service;
    }

    // 1. Danh sách chưa xóa mềm
    @GetMapping
    public List<SubstituteaAssignment> getAll() {
        return service.getAll();
    }

    // 2. Xem chi tiết
    @GetMapping("/{id}")
    public SubstituteaAssignment getById(@PathVariable UUID id) {
        return service.getById(id);
    }

    // 3. Thêm phân công dạy thay
    @PostMapping
    public SubstituteaAssignment create(@Valid @RequestBody SubstituteaAssignment item) {
        return service.create(item);
    }

    // 4. Sửa phân công
    @PutMapping("/{id}")
    public SubstituteaAssignment update(@PathVariable UUID id,
                                       @Valid @RequestBody SubstituteaAssignment item) {
        return service.update(id, item);
    }

    // 5. Xóa mềm
    @DeleteMapping("/{id}")
    public SubstituteaAssignment delete(@PathVariable UUID id,
                                       @RequestParam(required = false) UUID deletedBy) {
        return service.delete(id, deletedBy);
    }

    // 6. Xác nhận đã dạy thay thực tế (tính vào ngày công)
    @PatchMapping("/{id}/complete")
    public SubstituteaAssignment complete(@PathVariable UUID id,
                                         @RequestParam(required = false) UUID confirmedBy) {
        return service.complete(id, confirmedBy);
    }
}