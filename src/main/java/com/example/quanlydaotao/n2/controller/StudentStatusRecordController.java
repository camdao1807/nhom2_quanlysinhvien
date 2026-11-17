package com.example.quanlydaotao.n2.controller;

import java.util.List;
import java.util.UUID;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.example.quanlydaotao.n2.entity.StudentStatusRecord;
import com.example.quanlydaotao.n2.service.StudentStatusRecordService;

@RestController
@RequestMapping("/api/student-status-records")
public class StudentStatusRecordController {

    @Autowired
    private StudentStatusRecordService studentStatusRecordService;

    // ============================================================
    // 5 API CŨ - GIỮ NGUYÊN
    // ============================================================

    @GetMapping
    public List<StudentStatusRecord> listStatusRecords(
            @RequestParam(required = false) UUID studentId) {

        if (studentId != null) {
            return studentStatusRecordService.getByStudentId(studentId);
        }

        return studentStatusRecordService.getAll();
    }

    @GetMapping("/{id}")
    public StudentStatusRecord getStatusRecord(
            @PathVariable UUID id) {

        return studentStatusRecordService.getById(id);
    }

    @PostMapping
    public StudentStatusRecord createStatusRecord(
            @RequestBody StudentStatusRecord record) {

        return studentStatusRecordService.save(record);
    }

    @PutMapping("/{id}")
    public StudentStatusRecord updateStatusRecord(
            @PathVariable UUID id,
            @RequestBody StudentStatusRecord record) {

        record.setId(id);

        return studentStatusRecordService.save(record);
    }

    @DeleteMapping("/{id}")
    public void deleteStatusRecord(
            @PathVariable UUID id) {

        studentStatusRecordService.delete(id);
    }

    // ============================================================
    // 25 API BỔ SUNG
    // ============================================================

    // 1. Lấy tất cả bản ghi
    @GetMapping("/all")
    public List<StudentStatusRecord> getAllRecords() {

        return studentStatusRecordService.getAll();
    }

    // 2. Đếm tổng số bản ghi
    @GetMapping("/count")
    public long countRecords() {

        return studentStatusRecordService.getAll().size();
    }

    // 3. Lấy danh sách theo studentId
    @GetMapping("/student/{studentId}")
    public List<StudentStatusRecord> getRecordsByStudent(
            @PathVariable UUID studentId) {

        return studentStatusRecordService.getByStudentId(studentId);
    }

    // 4. Lọc theo mã trạng thái
    @GetMapping("/status/{statusCode}")
    public List<StudentStatusRecord> getByStatusCode(
            @PathVariable String statusCode) {

        return studentStatusRecordService.getAll()
                .stream()
                .filter(record ->
                        record.getStatusCode() != null
                                && record.getStatusCode()
                                .equalsIgnoreCase(statusCode))
                .toList();
    }

    // 5. Lấy các bản ghi đang hoạt động
    @GetMapping("/active")
    public List<StudentStatusRecord> getActiveRecords() {

        return studentStatusRecordService.getAll()
                .stream()
                .filter(record ->
                        Boolean.TRUE.equals(record.getIsActive()))
                .toList();
    }

    // 6. Lấy các bản ghi không hoạt động
    @GetMapping("/inactive")
    public List<StudentStatusRecord> getInactiveRecords() {

        return studentStatusRecordService.getAll()
                .stream()
                .filter(record ->
                        !Boolean.TRUE.equals(record.getIsActive()))
                .toList();
    }

    // 7. Lấy bản ghi có mô tả
    @GetMapping("/with-description")
    public List<StudentStatusRecord> getRecordsWithDescription() {

        return studentStatusRecordService.getAll()
                .stream()
                .filter(record ->
                        record.getDescription() != null
                                && !record.getDescription().isBlank())
                .toList();
    }

    // 8. Lấy bản ghi có lý do
    @GetMapping("/with-reason")
    public List<StudentStatusRecord> getRecordsWithReason() {

        return studentStatusRecordService.getAll()
                .stream()
                .filter(record ->
                        record.getReason() != null
                                && !record.getReason().isBlank())
                .toList();
    }

    // 9. Lọc theo ngày bắt đầu
    @GetMapping("/by-start-date/{date}")
    public List<StudentStatusRecord> getByStartDate(
            @PathVariable java.time.LocalDate date) {

        return studentStatusRecordService.getAll()
                .stream()
                .filter(record ->
                        date.equals(record.getStartDate()))
                .toList();
    }

    // 10. Lọc theo ngày kết thúc
    @GetMapping("/by-end-date/{date}")
    public List<StudentStatusRecord> getByEndDate(
            @PathVariable java.time.LocalDate date) {

        return studentStatusRecordService.getAll()
                .stream()
                .filter(record ->
                        date.equals(record.getEndDate()))
                .toList();
    }

    // 11. Lọc theo khoảng ngày
    @GetMapping("/date-range")
    public List<StudentStatusRecord> getByDateRange(
            @RequestParam java.time.LocalDate from,
            @RequestParam java.time.LocalDate to) {

        return studentStatusRecordService.getAll()
                .stream()
                .filter(record ->
                        record.getStartDate() != null
                                && !record.getStartDate().isBefore(from)
                                && !record.getStartDate().isAfter(to))
                .toList();
    }

    // 12. Lọc theo người tạo
    @GetMapping("/created-by/{createdBy}")
    public List<StudentStatusRecord> getByCreatedBy(
            @PathVariable UUID createdBy) {

        return studentStatusRecordService.getAll()
                .stream()
                .filter(record ->
                        createdBy.equals(record.getCreatedBy()))
                .toList();
    }

    // 13. Lọc theo người cập nhật
    @GetMapping("/updated-by/{updatedBy}")
    public List<StudentStatusRecord> getByUpdatedBy(
            @PathVariable UUID updatedBy) {

        return studentStatusRecordService.getAll()
                .stream()
                .filter(record ->
                        updatedBy.equals(record.getUpdatedBy()))
                .toList();
    }

    // 14. Lấy các bản ghi đã xóa
    @GetMapping("/deleted")
    public List<StudentStatusRecord> getDeletedRecords() {

        return studentStatusRecordService.getAll()
                .stream()
                .filter(record ->
                        record.getDeletedAt() != null)
                .toList();
    }

    // 15. Lấy các bản ghi chưa bị xóa
    @GetMapping("/not-deleted")
    public List<StudentStatusRecord> getNotDeletedRecords() {

        return studentStatusRecordService.getAll()
                .stream()
                .filter(record ->
                        record.getDeletedAt() == null)
                .toList();
    }

    // 16. Lấy bản ghi có ngày kết thúc
    @GetMapping("/has-end-date")
    public List<StudentStatusRecord> getRecordsHasEndDate() {

        return studentStatusRecordService.getAll()
                .stream()
                .filter(record ->
                        record.getEndDate() != null)
                .toList();
    }

    // 17. Lấy bản ghi chưa có ngày kết thúc
    @GetMapping("/no-end-date")
    public List<StudentStatusRecord> getRecordsNoEndDate() {

        return studentStatusRecordService.getAll()
                .stream()
                .filter(record ->
                        record.getEndDate() == null)
                .toList();
    }

    // 18. Tìm kiếm theo mã trạng thái, tên trạng thái,
    // mô tả hoặc lý do
    @GetMapping("/search")
    public List<StudentStatusRecord> searchRecords(
            @RequestParam String keyword) {

        String value = keyword.trim().toLowerCase();

        return studentStatusRecordService.getAll()
                .stream()
                .filter(record ->
                        (record.getStatusCode() != null
                                && record.getStatusCode()
                                .toLowerCase()
                                .contains(value))
                        ||
                        (record.getStatusName() != null
                                && record.getStatusName()
                                .toLowerCase()
                                .contains(value))
                        ||
                        (record.getDescription() != null
                                && record.getDescription()
                                .toLowerCase()
                                .contains(value))
                        ||
                        (record.getReason() != null
                                && record.getReason()
                                .toLowerCase()
                                .contains(value)))
                .toList();
    }

    // 19. Sắp xếp ngày bắt đầu tăng dần
    @GetMapping("/sort/start-asc")
    public List<StudentStatusRecord> sortStartDateAsc() {

        return studentStatusRecordService.getAll()
                .stream()
                .sorted(java.util.Comparator.comparing(
                        StudentStatusRecord::getStartDate,
                        java.util.Comparator.nullsLast(
                                java.util.Comparator.naturalOrder())))
                .toList();
    }

    // 20. Sắp xếp ngày bắt đầu giảm dần
    @GetMapping("/sort/start-desc")
    public List<StudentStatusRecord> sortStartDateDesc() {

        return studentStatusRecordService.getAll()
                .stream()
                .sorted(java.util.Comparator.comparing(
                        StudentStatusRecord::getStartDate,
                        java.util.Comparator.nullsLast(
                                java.util.Comparator.reverseOrder())))
                .toList();
    }

    // 21. Sắp xếp thời gian tạo mới nhất
    @GetMapping("/sort/created-desc")
    public List<StudentStatusRecord> sortCreatedDesc() {

        return studentStatusRecordService.getAll()
                .stream()
                .sorted(java.util.Comparator.comparing(
                        StudentStatusRecord::getCreatedAt,
                        java.util.Comparator.nullsLast(
                                java.util.Comparator.reverseOrder())))
                .toList();
    }

    // 22. Sắp xếp thời gian tạo cũ nhất
    @GetMapping("/sort/created-asc")
    public List<StudentStatusRecord> sortCreatedAsc() {

        return studentStatusRecordService.getAll()
                .stream()
                .sorted(java.util.Comparator.comparing(
                        StudentStatusRecord::getCreatedAt,
                        java.util.Comparator.nullsLast(
                                java.util.Comparator.naturalOrder())))
                .toList();
    }

    // 23. Thống kê trạng thái của một sinh viên
    @GetMapping("/summary/{studentId}")
    public java.util.Map<String, Object> getStudentSummary(
            @PathVariable UUID studentId) {

        List<StudentStatusRecord> records =
                studentStatusRecordService.getByStudentId(studentId);

        java.util.Map<String, Object> result =
                new java.util.HashMap<>();

        result.put("studentId", studentId);
        result.put("totalRecords", records.size());

        long activeCount = records.stream()
                .filter(record ->
                        Boolean.TRUE.equals(record.getIsActive()))
                .count();

        result.put("activeRecords", activeCount);
        result.put("inactiveRecords",
                records.size() - activeCount);

        return result;
    }

    // 24. Sao chép một bản ghi trạng thái
    @PostMapping("/copy/{id}")
    public StudentStatusRecord copyRecord(
            @PathVariable UUID id) {

        StudentStatusRecord oldRecord =
                studentStatusRecordService.getById(id);

        StudentStatusRecord newRecord =
                new StudentStatusRecord();

        newRecord.setStudentId(oldRecord.getStudentId());
        newRecord.setStatusCode(oldRecord.getStatusCode());
        newRecord.setStatusName(oldRecord.getStatusName());
        newRecord.setStartDate(oldRecord.getStartDate());
        newRecord.setEndDate(oldRecord.getEndDate());
        newRecord.setDescription(oldRecord.getDescription());
        newRecord.setReason(oldRecord.getReason());
        newRecord.setCreatedBy(oldRecord.getCreatedBy());
        newRecord.setIsActive(oldRecord.getIsActive());

        return studentStatusRecordService.save(newRecord);
    }

    // 25. Thống kê số lượng theo tên trạng thái
    @GetMapping("/statistics/status")
    public java.util.Map<String, Long> statusStatistics() {

        return studentStatusRecordService.getAll()
                .stream()
                .filter(record ->
                        record.getStatusName() != null)
                .collect(
                        java.util.stream.Collectors.groupingBy(
                                StudentStatusRecord::getStatusName,
                                java.util.stream.Collectors.counting()));
    }
}    