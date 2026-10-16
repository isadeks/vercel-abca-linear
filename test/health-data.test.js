import { describe, it, expect } from 'vitest';
import {
  RISK_LEVELS,
  projectStatus,
  risks,
  milestones,
  blockers,
  owners,
} from '../api/_lib/health-data.js';

describe('health-data module', () => {
  describe('RISK_LEVELS', () => {
    it('exports the three expected levels', () => {
      expect(RISK_LEVELS.GREEN).toBe('green');
      expect(RISK_LEVELS.AMBER).toBe('amber');
      expect(RISK_LEVELS.RED).toBe('red');
    });
  });

  describe('projectStatus', () => {
    it('has required fields', () => {
      expect(projectStatus.name).toBeTruthy();
      expect(projectStatus.overallRisk).toMatch(/^(green|amber|red)$/);
      expect(projectStatus.summary).toBeTruthy();
      expect(projectStatus.asOf).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });
  });

  describe('risks', () => {
    it('is a non-empty array', () => {
      expect(Array.isArray(risks)).toBe(true);
      expect(risks.length).toBeGreaterThan(0);
    });

    it('every item has required fields', () => {
      for (const r of risks) {
        expect(r.id).toBeTruthy();
        expect(r.category).toBeTruthy();
        expect(r.level).toMatch(/^(green|amber|red)$/);
        expect(r.title).toBeTruthy();
        expect(r.detail).toBeTruthy();
      }
    });

    it('ids are unique', () => {
      const ids = risks.map(r => r.id);
      expect(new Set(ids).size).toBe(ids.length);
    });
  });

  describe('milestones', () => {
    it('is a non-empty array', () => {
      expect(Array.isArray(milestones)).toBe(true);
      expect(milestones.length).toBeGreaterThan(0);
    });

    it('every item has valid ISO due dates', () => {
      for (const m of milestones) {
        expect(m.dueDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
        expect(m.title).toBeTruthy();
        expect(m.status).toMatch(/^(on-track|at-risk|done)$/);
        expect(m.owner).toBeTruthy();
      }
    });
  });

  describe('blockers', () => {
    it('is a non-empty array', () => {
      expect(Array.isArray(blockers)).toBe(true);
      expect(blockers.length).toBeGreaterThan(0);
    });

    it('every item has required fields', () => {
      for (const b of blockers) {
        expect(b.id).toBeTruthy();
        expect(b.title).toBeTruthy();
        expect(b.raisedDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
        expect(b.raisedBy).toBeTruthy();
        expect(b.blockedArea).toBeTruthy();
        // resolution may be null (unresolved) or a non-empty string
        if (b.resolution !== null) {
          expect(typeof b.resolution).toBe('string');
          expect(b.resolution.length).toBeGreaterThan(0);
        }
      }
    });
  });

  describe('owners', () => {
    it('is a non-empty array', () => {
      expect(Array.isArray(owners)).toBe(true);
      expect(owners.length).toBeGreaterThan(0);
    });

    it('every item has a valid-looking email', () => {
      for (const o of owners) {
        expect(o.email).toMatch(/^[^@]+@[^@]+$/);
        expect(o.name).toBeTruthy();
        expect(o.role).toBeTruthy();
        expect(o.slack).toMatch(/^@/);
      }
    });

    it('milestone owners all resolve to an owner record', () => {
      const ownerIds = new Set(owners.map(o => o.id));
      for (const m of milestones) {
        expect(ownerIds.has(m.owner),
          `Milestone "${m.id}" references unknown owner "${m.owner}"`
        ).toBe(true);
      }
    });
  });
});
