package com.example.quanlydaotao.n2.controller;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.example.quanlydaotao.n2.entity.Student;
import com.example.quanlydaotao.n2.entity.StudentClass;

import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import jakarta.persistence.metamodel.Attribute;

@RestController
@RequestMapping("/api/students")
public class StudentAssignClassController {

    @PersistenceContext
    private EntityManager em;

    // Nhận id dạng chuỗi (UUID hoặc số đều được), sau đó tự đổi sang đúng kiểu của entity
    public static class AssignRequest {
        public List<String> studentIds;
        public String studentClasseId;
    }

    private static Object convert(String s, Class<?> type) {
        if (type == UUID.class) return UUID.fromString(s);
        if (type == Long.class || type == long.class) return Long.valueOf(s);
        if (type == Integer.class || type == int.class) return Integer.valueOf(s);
        return s;
    }
    @Transactional
    public ResponseEntity<?> assign(@RequestBody AssignRequest req) {
        if (req.studentIds == null || req.studentIds.isEmpty() || req.studentClasseId == null) {
            return ResponseEntity.badRequest().body("Thiếu studentIds hoặc studentClasseId");
        }

        Class<?> classIdType = em.getMetamodel().entity(StudentClass.class).getIdType().getJavaType();
        Class<?> studentIdType = em.getMetamodel().entity(Student.class).getIdType().getJavaType();

        Object classId;
        List<Object> studentIds = new ArrayList<>();
        try {
            classId = convert(req.studentClasseId, classIdType);
            for (String id : req.studentIds) studentIds.add(convert(id, studentIdType));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body("Id không hợp lệ: " + e.getMessage());
        }

        StudentClass cls = em.find(StudentClass.class, classId);
        if (cls == null) {
            return ResponseEntity.status(404).body("Không tìm thấy lớp");
        }

        // Tự tìm field "lớp" trong entity Student
        String attr = null;
        boolean relation = false;
        Class<?> attrType = null;
        StringBuilder names = new StringBuilder();

        for (Attribute<? super Student, ?> a : em.getMetamodel().entity(Student.class).getAttributes()) {
            names.append(a.getName()).append(", ");
            if (a.getJavaType() == StudentClass.class) {
                attr = a.getName();
                relation = true;
                break;
            }
        }
        if (attr == null) {
            for (Attribute<? super Student, ?> a : em.getMetamodel().entity(Student.class).getAttributes()) {
                Class<?> t = a.getJavaType();
                boolean ok = t == UUID.class || t == Long.class || t == Integer.class || t == String.class;
                if (ok && a.getName().toLowerCase().matches(".*class.*id|.*classe.*id")) {
                    attr = a.getName();
                    attrType = t;
                    break;
                }
            }
        }
        if (attr == null) {
            return ResponseEntity.status(500)
                    .body("Không tìm thấy field lớp trong Student. Các field: " + names);
        }

        Object value = relation ? cls : convert(req.studentClasseId, attrType);

        int n = em.createQuery("UPDATE Student s SET s." + attr + " = :v WHERE s.id IN :ids")
                .setParameter("v", value)
                .setParameter("ids", studentIds)
                .executeUpdate();

        return ResponseEntity.ok(Map.of("updated", n));
    }
}