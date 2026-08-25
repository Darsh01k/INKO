-- Inko Platform: helper objects (updated_at trigger)

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Template to attach per table:
-- CREATE TRIGGER trg_<table>_updated_at BEFORE UPDATE ON <table>
-- FOR EACH ROW EXECUTE FUNCTION set_updated_at();
