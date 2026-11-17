package com.example.quanlydaotao.n2.service;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import com.example.quanlydaotao.n2.entity.SubstituteaAssignment;
import com.example.quanlydaotao.n2.repository.SubstituteaAssignmentRepository;

@Service
public class SubstituteaAssignmentService {

    private final SubstituteaAssignmentRepository repository;

    public SubstituteaAssignmentService(SubstituteaAssignmentRepository repository) {
        this.repository = repository;
    }

    public List<SubstituteaAssignment> getAll() {
        return repository.findByDeletedAtIsNull(
                Sort.by(Sort.Direction.DESC, "teachingDate", "createdAt"));
    }

    public SubstituteaAssignment getById(UUID id) {
        return repository.findByIdAndDeletedAtIsNull(id)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND, "Không tìm thấy phân công dạy thay"));
    }

    private void validate(SubstituteaAssignment x, UUID selfId) {
        if (x.getTeachingDate() == null)
            throw bad("Ngày dạy không được để trống");
        if (x.getStudentClasseId() == null)
            throw bad("Lớp học không được để trống");
        if (x.getMainEmployeeId() == null)
            throw bad("Giáo viên chính không được để trống");
        if (x.getSubstituteEmployeeId() == null)
            throw bad("Giáo viên dạy thay không được để trống");
        if (x.getMainEmployeeId().equals(x.getSubstituteEmployeeId()))
            throw bad("Giáo viên dạy thay phải khác giáo viên chính");

        boolean dup = (selfId == null)
                ? repository.existsByTeachingDateAndStudentClasseIdAndSubstituteEmployeeIdAndDeletedAtIsNull(
                        x.getTeachingDate(), x.getStudentClasseId(), x.getSubstituteEmployeeId())
                : repository.existsByTeachingDateAndStudentClasseIdAndSubstituteEmployeeIdAndDeletedAtIsNullAndIdNot(
                        x.getTeachingDate(), x.getStudentClasseId(), x.getSubstituteEmployeeId(), selfId);
        if (dup) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "Đã có phân công dạy thay trùng (cùng ngày, lớp và giáo viên)");
        }
    }

    private ResponseStatusException bad(String msg) {
        return new ResponseStatusException(HttpStatus.BAD_REQUEST, msg);
    }

    private SubstituteaAssignment saveSafely(SubstituteaAssignment x) {
        try {
            return repository.saveAndFlush(x);
        } catch (DataIntegrityViolationException ex) {
            // FK sai (giáo viên/lớp không tồn tại) hoặc trùng index
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "Dữ liệu không hợp lệ: giáo viên/lớp không tồn tại hoặc phân công bị trùng");
        }
    }

    @Transactional
    public SubstituteaAssignment create(SubstituteaAssignment x) {
        validate(x, null);

        x.setId(null);
        x.setStatus(SubstituteaAssignment.ASSIGNED);   // luôn bắt đầu ở trạng thái đã phân công
        x.setConfirmedAt(null);
        x.setConfirmedBy(null);
        x.setCreatedAt(LocalDateTime.now());
        x.setUpdatedAt(null);
        x.setDeletedAt(null);
        x.setDeletedBy(null);
        x.setIsActive(true);
        return saveSafely(x);
    }

    @Transactional
    public SubstituteaAssignment update(UUID id, SubstituteaAssignment req) {
        SubstituteaAssignment item = getById(id);
        validate(req, id);

        item.setTeachingDate(req.getTeachingDate());
        item.setStudentClasseId(req.getStudentClasseId());
        item.setMainEmployeeId(req.getMainEmployeeId());
        item.setSubstituteEmployeeId(req.getSubstituteEmployeeId());
        item.setNote(req.getNote());
        item.setUpdatedBy(req.getUpdatedBy());
        item.setUpdatedAt(LocalDateTime.now());
        // status chỉ đổi qua /complete, không cho sửa trực tiếp từ PUT
        return saveSafely(item);
    }

    @Transactional
    public SubstituteaAssignment delete(UUID id, UUID deletedBy) {
        SubstituteaAssignment item = getById(id);
        item.setDeletedAt(LocalDateTime.now());
        item.setDeletedBy(deletedBy);
        item.setIsActive(false);
        return repository.save(item);
    }

    @Transactional
    public SubstituteaAssignment complete(UUID id, UUID confirmedBy) {
        SubstituteaAssignment item = getById(id);

        if (SubstituteaAssignment.COMPLETED.equals(item.getStatus())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "Phân công này đã được xác nhận hoàn thành");
        }
        if (item.getTeachingDate().isAfter(LocalDate.now())) {
            throw bad("Chưa đến ngày dạy, không thể xác nhận hoàn thành");
        }

        item.setStatus(SubstituteaAssignment.COMPLETED);
        item.setConfirmedAt(LocalDateTime.now());
        item.setConfirmedBy(confirmedBy);
        item.setUpdatedAt(LocalDateTime.now());
        return repository.save(item);
    }
}