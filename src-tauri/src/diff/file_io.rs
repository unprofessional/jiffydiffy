use content_inspector::{inspect, ContentType};
use encoding_rs::Encoding;
use memmap2::Mmap;
use std::{fs::File, path::Path};

use super::types::FileKind;

pub(crate) struct LoadedFile {
    pub kind: FileKind,
    pub text: Option<String>,
    pub size_bytes: Option<u64>,
}

pub(crate) fn load_file_text_or_binary(path: &Path) -> std::io::Result<LoadedFile> {
    if !path.exists() {
        return Ok(LoadedFile { kind: FileKind::Missing, text: None, size_bytes: None });
    }
    let file = File::open(path)?;
    let meta = file.metadata()?;
    let size = Some(meta.len());

    // SAFETY: read-only map of a regular file
    let mmap = unsafe { Mmap::map(&file)? };

    let head = &mmap[..mmap.len().min(8192)];
    if matches!(inspect(head), ContentType::BINARY) {
        return Ok(LoadedFile { kind: FileKind::Binary, text: None, size_bytes: size });
    }

    if let Ok(s) = std::str::from_utf8(&mmap) {
        return Ok(LoadedFile {
            kind: FileKind::Text { encoding: Some("utf-8".into()) },
            text: Some(s.to_owned()),
            size_bytes: size,
        });
    }

    let (enc, _) = Encoding::for_bom(&mmap).unwrap_or((encoding_rs::UTF_8, 0));
    let (cow, _, _) = enc.decode(&mmap);
    Ok(LoadedFile {
        kind: FileKind::Text { encoding: Some(enc.name().to_lowercase()) },
        text: Some(cow.into_owned()),
        size_bytes: size,
    })
}

pub(crate) fn load_string_as_text(s: &str) -> LoadedFile {
    LoadedFile {
        kind: FileKind::Text { encoding: Some("utf-8".into()) },
        text: Some(s.to_string()),
        size_bytes: Some(s.len() as u64),
    }
}
