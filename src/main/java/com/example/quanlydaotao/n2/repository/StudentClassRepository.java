package com.example.quanlydaotao.n2.repository;

import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import com.example.quanlydaotao.n2.entity.StudentClass;

@Repository
public interface StudentClassRepository extends JpaRepository<StudentClass, UUID> {
    

    boolean existsByCode(String code);

    boolean existsByCodeAndIdNot(String code, UUID id);

    Page<StudentClass> findByCodeContainingIgnoreCaseOrNameContainingIgnoreCase(
            String code,
            String name,
            Pageable pageable);
}