
package com.example.quanlydaotao.n2.controller;

import java.util.List;
import java.util.UUID;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import com.example.quanlydaotao.n2.entity.Employee;
import com.example.quanlydaotao.n2.repository.EmployeeRepository;

@RestController
@RequestMapping("/api/employees")
@CrossOrigin(origins = "*")
public class EmployeeController {

    private final EmployeeRepository employeeRepository;

    public EmployeeController(EmployeeRepository employeeRepository) {
        this.employeeRepository = employeeRepository;
    }

    // 1. Lấy danh sách giảng viên chưa bị xóa
    @GetMapping
    public ResponseEntity<List<Employee>> getAllEmployees() {
        return ResponseEntity.ok(
            employeeRepository.findByDeletedAtIsNull()
        );
    }

    // 2. Lấy danh sách giảng viên đang hoạt động
    @GetMapping("/active")
    public ResponseEntity<List<Employee>> getActiveEmployees() {
        return ResponseEntity.ok(
            employeeRepository.findByIsActiveTrueAndDeletedAtIsNull()
        );
    }

    // 3. Xem chi tiết giảng viên
    @GetMapping("/{id}")
    public ResponseEntity<Employee> getEmployeeById(
            @PathVariable UUID id) {

        return employeeRepository.findById(id)
            .filter(employee -> employee.getDeletedAt() == null)
            .map(ResponseEntity::ok)
            .orElse(ResponseEntity.notFound().build());
    }

    // 4. Tìm kiếm theo mã giảng viên
    @GetMapping("/search")
    public ResponseEntity<List<Employee>> searchEmployees(
            @RequestParam String keyword) {

        return ResponseEntity.ok(
            employeeRepository.findByCodeContainingIgnoreCaseAndDeletedAtIsNull(keyword)
        );
    }
}
