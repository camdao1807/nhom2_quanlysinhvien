
package com.example.quanlydaotao.n2.repository;

import java.util.List;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import com.example.quanlydaotao.n2.entity.Employee;

@Repository
public interface EmployeeRepository extends JpaRepository<Employee, UUID> {

    // Lấy giảng viên chưa bị xóa mềm
    List<Employee> findByDeletedAtIsNull();

    // Lấy giảng viên đang hoạt động và chưa bị xóa
    List<Employee> findByIsActiveTrueAndDeletedAtIsNull();

    // Tìm theo mã giảng viên
    List<Employee> findByCodeContainingIgnoreCaseAndDeletedAtIsNull(String code);

}
